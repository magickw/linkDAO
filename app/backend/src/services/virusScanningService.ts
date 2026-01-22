/**
 * Virus Scanning Service
 * Integrates with ClamAV for malware detection
 * Falls back to VirusTotal API if ClamAV is unavailable
 */

import { safeLogger } from '../utils/safeLogger';
import { FILE_UPLOAD_CONFIG } from '../config/fileUploadConfig';

// ClamAV integration (optional dependency)
let NodeClam: any;
try {
    NodeClam = require('clamscan');
} catch (e) {
    safeLogger.warn('[VirusScanning] ClamAV (clamscan) not installed. Virus scanning will be limited.');
}

export interface VirusScanResult {
    isClean: boolean;
    isInfected: boolean;
    viruses: string[];
    scanTime: number;
    scanner: 'clamav' | 'virustotal' | 'none';
    error?: string;
}

export class VirusScanningService {
    private clamScan: any = null;
    private isInitialized = false;
    private initializationPromise: Promise<void> | null = null;

    constructor() {
        if (FILE_UPLOAD_CONFIG.virusScanning.enabled && NodeClam) {
            this.initializationPromise = this.initializeClamAV();
        }
    }

    /**
     * Initialize ClamAV scanner
     */
    private async initializeClamAV(): Promise<void> {
        if (this.isInitialized || !NodeClam) return;

        try {
            const clamavHost = process.env.CLAMAV_HOST || 'localhost';
            const clamavPort = parseInt(process.env.CLAMAV_PORT || '3310');

            this.clamScan = await new NodeClam().init({
                clamdscan: {
                    host: clamavHost,
                    port: clamavPort,
                    timeout: FILE_UPLOAD_CONFIG.virusScanning.scanTimeout,
                    multiscan: true,
                    reload_db: false,
                    active: true,
                    bypass_test: false,
                },
                preference: 'clamdscan'
            });

            this.isInitialized = true;
            safeLogger.info(`[VirusScanning] ClamAV initialized successfully (${clamavHost}:${clamavPort})`);
        } catch (error) {
            safeLogger.error('[VirusScanning] Failed to initialize ClamAV:', error);
            this.isInitialized = false;
        }
    }

    /**
     * Scan file buffer for viruses
     */
    async scanFile(fileBuffer: Buffer, filename: string): Promise<VirusScanResult> {
        if (!FILE_UPLOAD_CONFIG.virusScanning.enabled) {
            return {
                isClean: true,
                isInfected: false,
                viruses: [],
                scanTime: 0,
                scanner: 'none'
            };
        }

        const startTime = Date.now();

        // Wait for initialization if in progress
        if (this.initializationPromise) {
            await this.initializationPromise;
        }

        // Try ClamAV first
        if (this.isInitialized && this.clamScan) {
            try {
                const result = await this.scanWithClamAV(fileBuffer, filename);
                result.scanTime = Date.now() - startTime;
                return result;
            } catch (error) {
                safeLogger.error('[VirusScanning] ClamAV scan failed:', error);
                // Fall through to VirusTotal
            }
        }

        // Fallback to VirusTotal if API key is available
        if (process.env.VIRUSTOTAL_API_KEY) {
            try {
                const result = await this.scanWithVirusTotal(fileBuffer, filename);
                result.scanTime = Date.now() - startTime;
                return result;
            } catch (error) {
                safeLogger.error('[VirusScanning] VirusTotal scan failed:', error);
            }
        }

        // No scanner available
        safeLogger.warn('[VirusScanning] No virus scanner available, allowing file');
        return {
            isClean: true,
            isInfected: false,
            viruses: [],
            scanTime: Date.now() - startTime,
            scanner: 'none',
            error: 'No virus scanner available'
        };
    }

    /**
     * Scan with ClamAV
     */
    private async scanWithClamAV(fileBuffer: Buffer, filename: string): Promise<VirusScanResult> {
        try {
            const { isInfected, viruses } = await this.clamScan.scanBuffer(fileBuffer);

            return {
                isClean: !isInfected,
                isInfected,
                viruses: viruses || [],
                scanTime: 0, // Will be set by caller
                scanner: 'clamav'
            };
        } catch (error) {
            safeLogger.error('[VirusScanning] ClamAV scan error:', error);
            throw error;
        }
    }

    /**
     * Scan with VirusTotal API
     */
    private async scanWithVirusTotal(fileBuffer: Buffer, filename: string): Promise<VirusScanResult> {
        const apiKey = process.env.VIRUSTOTAL_API_KEY;
        if (!apiKey) {
            throw new Error('VirusTotal API key not configured');
        }

        try {
            // Note: This is a simplified implementation
            // In production, you'd use the virustotal-api package
            const FormData = require('form-data');
            const form = new FormData();
            form.append('file', fileBuffer, filename);

            const response = await fetch('https://www.virustotal.com/vtapi/v2/file/scan', {
                method: 'POST',
                headers: {
                    'x-apikey': apiKey
                },
                body: form
            });

            if (!response.ok) {
                throw new Error(`VirusTotal API error: ${response.statusText}`);
            }

            const data = await response.json();

            // Poll for results (simplified - in production, use proper polling)
            await new Promise(resolve => setTimeout(resolve, 5000));

            const reportResponse = await fetch(
                `https://www.virustotal.com/vtapi/v2/file/report?apikey=${apiKey}&resource=${data.resource}`
            );

            const report = await reportResponse.json();

            const isInfected = report.positives > 0;
            const viruses = isInfected ? [`Detected by ${report.positives} scanners`] : [];

            return {
                isClean: !isInfected,
                isInfected,
                viruses,
                scanTime: 0, // Will be set by caller
                scanner: 'virustotal'
            };
        } catch (error) {
            safeLogger.error('[VirusScanning] VirusTotal scan error:', error);
            throw error;
        }
    }

    /**
     * Scan EICAR test file (for testing)
     */
    async scanEICARTest(): Promise<VirusScanResult> {
        // EICAR test virus signature
        const eicarSignature = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
        const eicarBuffer = Buffer.from(eicarSignature);

        return this.scanFile(eicarBuffer, 'eicar.txt');
    }

    /**
     * Check if virus scanning is available
     */
    isAvailable(): boolean {
        return this.isInitialized || !!process.env.VIRUSTOTAL_API_KEY;
    }

    /**
     * Get scanner status
     */
    getStatus(): {
        enabled: boolean;
        clamavAvailable: boolean;
        virustotalAvailable: boolean;
        activeScanner: 'clamav' | 'virustotal' | 'none';
    } {
        return {
            enabled: FILE_UPLOAD_CONFIG.virusScanning.enabled,
            clamavAvailable: this.isInitialized,
            virustotalAvailable: !!process.env.VIRUSTOTAL_API_KEY,
            activeScanner: this.isInitialized ? 'clamav' :
                process.env.VIRUSTOTAL_API_KEY ? 'virustotal' : 'none'
        };
    }
}

// Export singleton instance
export const virusScanningService = new VirusScanningService();
export default virusScanningService;
