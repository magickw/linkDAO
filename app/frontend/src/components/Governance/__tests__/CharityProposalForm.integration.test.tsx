import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CharityProposalForm } from '@/components/Governance/CharityProposalForm';
import { charityVerificationService } from '@/services/charityVerificationService';
import { ipfsUploadService } from '@/services/ipfsUploadService';

// Mock services
jest.mock('@/services/charityVerificationService');
jest.mock('@/services/ipfsUploadService');

describe('CharityProposalForm Integration', () => {
    const mockOnSubmit = jest.fn();
    const mockOnCancel = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should render all form fields', () => {
        render(
            <CharityProposalForm
                onSubmit={mockOnSubmit}
                isSubmitting={false}
                onCancel={mockOnCancel}
            />
        );

        expect(screen.getByLabelText(/Proposal Title/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Proposal Description/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Charity Name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Charity Wallet Address/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Donation Amount/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Charity Mission/i)).toBeInTheDocument();
    });

    it('should search and auto-fill charity from Charity Navigator', async () => {
        const mockCharity = {
            ein: '123456789',
            charityName: 'American Red Cross',
            mission: 'Disaster relief and emergency assistance',
            websiteURL: 'https://redcross.org',
            overallRating: 4,
            category: { categoryName: 'Health' }
        };

        (charityVerificationService.searchCharity as jest.Mock).mockResolvedValue([mockCharity]);

        render(
            <CharityProposalForm
                onSubmit={mockOnSubmit}
                isSubmitting={false}
            />
        );

        // Type in charity search
        const searchInput = screen.getByPlaceholderText(/Search by name or EIN/i);
        await userEvent.type(searchInput, 'American Red Cross');

        // Wait for search results
        await waitFor(() => {
            expect(charityVerificationService.searchCharity).toHaveBeenCalledWith('American Red Cross');
        });

        // Click on search result
        const searchResult = await screen.findByText('American Red Cross');
        fireEvent.click(searchResult);

        // Verify auto-fill
        await waitFor(() => {
            const missionField = screen.getByLabelText(/Charity Mission/i) as HTMLTextAreaElement;
            expect(missionField.value).toBe('Disaster relief and emergency assistance');
        });
    });

    it('should validate required fields', async () => {
        render(
            <CharityProposalForm
                onSubmit={mockOnSubmit}
                isSubmitting={false}
            />
        );

        // Try to submit without filling fields
        const submitButton = screen.getByText(/Create Charity Proposal/i);
        fireEvent.click(submitButton);

        // Should show validation errors
        await waitFor(() => {
            expect(screen.getByText(/Title is required/i)).toBeInTheDocument();
            expect(screen.getByText(/Description is required/i)).toBeInTheDocument();
        });

        expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should validate Ethereum address', async () => {
        render(
            <CharityProposalForm
                onSubmit={mockOnSubmit}
                isSubmitting={false}
            />
        );

        const addressInput = screen.getByLabelText(/Charity Wallet Address/i);
        await userEvent.type(addressInput, 'invalid-address');

        const submitButton = screen.getByText(/Create Charity Proposal/i);
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText(/Invalid Ethereum address/i)).toBeInTheDocument();
        });
    });

    it('should toggle between link and document verification methods', () => {
        render(
            <CharityProposalForm
                onSubmit={mockOnSubmit}
                isSubmitting={false}
            />
        );

        const linkButton = screen.getByText('Link/URL');
        const documentButton = screen.getByText('Upload Documents');

        // Initially on link mode
        expect(screen.getByPlaceholderText(/IPFS hash, website URL/i)).toBeInTheDocument();

        // Switch to document mode
        fireEvent.click(documentButton);
        expect(screen.getByText(/Click to upload or drag and drop/i)).toBeInTheDocument();

        // Switch back to link mode
        fireEvent.click(linkButton);
        expect(screen.getByPlaceholderText(/IPFS hash, website URL/i)).toBeInTheDocument();
    });

    it('should handle document upload', async () => {
        const mockUploadResult = {
            cid: 'QmTest123',
            url: 'https://ipfs.io/ipfs/QmTest123',
            size: 1024,
            type: 'application/pdf'
        };

        (ipfsUploadService.uploadCharityDocument as jest.Mock).mockResolvedValue(mockUploadResult);

        render(
            <CharityProposalForm
                onSubmit={mockOnSubmit}
                isSubmitting={false}
            />
        );

        // Switch to document mode
        const documentButton = screen.getByText('Upload Documents');
        fireEvent.click(documentButton);

        // Create a mock file
        const file = new File(['test content'], 'verification.pdf', { type: 'application/pdf' });
        const fileInput = screen.getByLabelText(/file-upload/i, { selector: 'input' });

        // Upload file
        await userEvent.upload(fileInput, file);

        // Click upload button
        const uploadButton = await screen.findByText(/Upload to IPFS/i);
        fireEvent.click(uploadButton);

        await waitFor(() => {
            expect(ipfsUploadService.uploadCharityDocument).toHaveBeenCalled();
        });
    });

    it('should submit form with all data', async () => {
        render(
            <CharityProposalForm
                onSubmit={mockOnSubmit}
                isSubmitting={false}
            />
        );

        // Fill in all required fields
        await userEvent.type(screen.getByLabelText(/Proposal Title/i), 'Help Disaster Victims');
        await userEvent.type(screen.getByLabelText(/Proposal Description/i), 'Support disaster relief efforts');
        await userEvent.type(screen.getByLabelText(/Charity Name/i), 'Red Cross');
        await userEvent.type(screen.getByLabelText(/Charity Wallet Address/i), '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb');
        await userEvent.type(screen.getByLabelText(/Donation Amount/i), '1000');
        await userEvent.type(screen.getByLabelText(/Charity Mission/i), 'Disaster relief');

        // Submit form
        const submitButton = screen.getByText(/Create Charity Proposal/i);
        fireEvent.click(submitButton);

        await waitFor(() => {
            expect(mockOnSubmit).toHaveBeenCalledWith(
                expect.objectContaining({
                    title: 'Help Disaster Victims',
                    description: 'Support disaster relief efforts',
                    charityName: 'Red Cross',
                    donationAmount: '1000'
                })
            );
        });
    });

    it('should disable form during submission', async () => {
        render(
            <CharityProposalForm
                onSubmit={mockOnSubmit}
                isSubmitting={true}
            />
        );

        const titleInput = screen.getByLabelText(/Proposal Title/i);
        const submitButton = screen.getByText(/Creating.../i);

        expect(titleInput).toBeDisabled();
        expect(submitButton).toBeDisabled();
    });

    it('should call onCancel when cancel button is clicked', () => {
        render(
            <CharityProposalForm
                onSubmit={mockOnSubmit}
                isSubmitting={false}
                onCancel={mockOnCancel}
            />
        );

        const cancelButton = screen.getByText('Cancel');
        fireEvent.click(cancelButton);

        expect(mockOnCancel).toHaveBeenCalled();
    });
});
