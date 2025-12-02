import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ReportGeneratorService } from '../reportGeneratorService';

// Mock dependencies
jest.mock('../returnAnalyticsService');
jest.mock('../refundCostAnalysisService');
jest.mock('../refundMonitoringService');
jest.mock('node-cron');
jest.mock('nodemailer');

describe('ReportGeneratorService', () => {
    let service: ReportGeneratorService;

    beforeEach(() => {
        service = new ReportGeneratorService();
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('generateReport', () => {
        it('should throw error for unknown template', async () => {
            const parameters = {
                startDate: new Date('2024-01-01'),
                endDate: new Date('2024-01-31'),
            };

            await expect(
                service.generateReport('unknown_template', parameters)
            ).rejects.toThrow('Template unknown_template not found');
        });
    });

    describe('scheduleReport', () => {
        it('should schedule a report with cron expression', async () => {
            const schedule = await service.scheduleReport(
                'daily_refund_summary',
                '0 9 * * *',
                ['admin@example.com']
            );

            expect(schedule).toBeDefined();
            expect(schedule.templateId).toBe('daily_refund_summary');
            expect(schedule.cronExpression).toBe('0 9 * * *');
            expect(schedule.recipients).toEqual(['admin@example.com']);
            expect(schedule.enabled).toBe(true);
            expect(schedule.nextRun).toBeInstanceOf(Date);
        });

        it('should cancel a scheduled report', async () => {
            const schedule = await service.scheduleReport(
                'weekly_performance',
                '0 9 * * 1',
                ['admin@example.com']
            );

            const cancelled = await service.cancelSchedule(schedule.id);

            expect(cancelled).toBe(true);
        });

        it('should list active schedules', async () => {
            await service.scheduleReport(
                'daily_refund_summary',
                '0 9 * * *',
                ['admin@example.com']
            );

            await service.scheduleReport(
                'weekly_performance',
                '0 9 * * 1',
                ['manager@example.com']
            );

            const activeSchedules = service.getActiveSchedules();

            expect(activeSchedules).toHaveLength(2);
            expect(activeSchedules[0].enabled).toBe(true);
            expect(activeSchedules[1].enabled).toBe(true);
        });
    });

    describe('deliverReport', () => {
        it('should handle storage delivery', async () => {
            const mockReport = {
                id: 'rpt_123',
                templateId: 'daily_refund_summary',
                templateName: 'Daily Refund Summary',
                generatedAt: new Date(),
                parameters: {
                    startDate: new Date('2024-01-01'),
                    endDate: new Date('2024-01-31'),
                },
                data: { test: 'data' },
                format: 'json',
                size: 100,
            };

            // Should not throw
            await expect(
                service.deliverReport(mockReport, [], 'storage')
            ).resolves.not.toThrow();
        });

        it('should throw error for unknown delivery method', async () => {
            const mockReport = {
                id: 'rpt_123',
                templateId: 'daily_refund_summary',
                templateName: 'Daily Refund Summary',
                generatedAt: new Date(),
                parameters: {
                    startDate: new Date('2024-01-01'),
                    endDate: new Date('2024-01-31'),
                },
                data: { test: 'data' },
                format: 'json',
                size: 100,
            };

            await expect(
                service.deliverReport(mockReport, [], 'unknown' as any)
            ).rejects.toThrow('Unknown delivery method');
        });
    });

    describe('getReportHistory', () => {
        it('should return empty history for new template', () => {
            const history = service.getReportHistory('daily_refund_summary');

            expect(history).toEqual([]);
        });
    });

    describe('formatReportData', () => {
        it('should return JSON format as-is', async () => {
            const data = { test: 'data', value: 123 };
            const formatted = await (service as any).formatReportData(data, 'json');

            expect(formatted).toEqual(data);
        });

        it('should convert array data to CSV', async () => {
            const data = [
                { id: 1, name: 'Test 1', value: 100 },
                { id: 2, name: 'Test 2', value: 200 },
            ];

            const formatted = await (service as any).formatReportData(data, 'csv');

            expect(typeof formatted).toBe('string');
            expect(formatted).toContain('id,name,value');
            expect(formatted).toContain('1,"Test 1",100');
            expect(formatted).toContain('2,"Test 2",200');
        });

        it('should handle PDF format with note', async () => {
            const data = { test: 'data' };
            const formatted = await (service as any).formatReportData(data, 'pdf');

            expect(formatted).toHaveProperty('_note');
            expect(formatted._note).toContain('PDF generation not yet implemented');
        });
    });
});
