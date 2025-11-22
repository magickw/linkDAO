import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CharityVerification } from '../CharityVerification';
import { adminService } from '@/services/adminService';
import toast from 'react-hot-toast';

// Mock dependencies
jest.mock('@/services/adminService');
jest.mock('react-hot-toast');

describe('CharityVerification Component', () => {
    const mockCharities = [
        {
            id: '1',
            title: 'Save the Whales',
            description: 'Ocean conservation',
            charityName: 'Ocean Conservation Fund',
            charityDescription: 'Protecting marine life',
            ein: '12-3456789',
            donationAmount: 10000,
            charityNavigatorRating: 4,
            documentIPFSHashes: ['QmHash1', 'QmHash2'],
            proofOfVerification: 'https://example.com/proof',
            impactMetrics: '1000 whales saved',
            status: 'pending',
            isVerifiedCharity: false,
            endTime: new Date('2024-12-31'),
            createdAt: new Date('2024-01-01'),
        },
        {
            id: '2',
            title: 'Feed the Hungry',
            description: 'Food distribution',
            charityName: 'Food Bank Network',
            charityDescription: 'Fighting hunger',
            ein: '98-7654321',
            donationAmount: 5000,
            status: 'active',
            isVerifiedCharity: true,
            endTime: new Date('2024-12-31'),
            createdAt: new Date('2024-01-01'),
        },
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        (adminService.getCharities as jest.Mock).mockResolvedValue(mockCharities);
    });

    describe('Rendering', () => {
        it('should render loading state initially', () => {
            render(<CharityVerification />);
            expect(screen.getByRole('status')).toBeInTheDocument();
        });

        it('should render charity proposals after loading', async () => {
            render(<CharityVerification />);

            await waitFor(() => {
                expect(screen.getByText('Save the Whales')).toBeInTheDocument();
                expect(screen.getByText('Feed the Hungry')).toBeInTheDocument();
            });
        });

        it('should display charity details', async () => {
            render(<CharityVerification />);

            await waitFor(() => {
                expect(screen.getByText('Ocean Conservation Fund')).toBeInTheDocument();
                expect(screen.getByText(/12-3456789/)).toBeInTheDocument();
                expect(screen.getByText('10000 LDAO')).toBeInTheDocument();
            });
        });
    });

    describe('Data Fetching', () => {
        it('should call adminService.getCharities on mount', async () => {
            render(<CharityVerification />);

            await waitFor(() => {
                expect(adminService.getCharities).toHaveBeenCalledTimes(1);
            });
        });

        it('should handle empty charity list', async () => {
            (adminService.getCharities as jest.Mock).mockResolvedValue([]);

            render(<CharityVerification />);

            await waitFor(() => {
                expect(screen.getByText(/No.*proposals found/i)).toBeInTheDocument();
            });
        });

        it('should handle API errors', async () => {
            const errorMessage = 'Failed to load charities';
            (adminService.getCharities as jest.Mock).mockRejectedValue(new Error(errorMessage));

            render(<CharityVerification />);

            await waitFor(() => {
                expect(screen.getByText(/Error Loading Charities/i)).toBeInTheDocument();
                expect(toast.error).toHaveBeenCalledWith('Failed to load charity proposals');
            });
        });

        it('should show retry button on error', async () => {
            (adminService.getCharities as jest.Mock).mockRejectedValue(new Error('API Error'));

            render(<CharityVerification />);

            await waitFor(() => {
                const retryButton = screen.getByText('Try Again');
                expect(retryButton).toBeInTheDocument();
            });
        });
    });

    describe('Approve Charity', () => {
        it('should approve charity successfully', async () => {
            (adminService.approveCharity as jest.Mock).mockResolvedValue({ success: true });

            render(<CharityVerification />);

            await waitFor(() => {
                expect(screen.getByText('Save the Whales')).toBeInTheDocument();
            });

            // Click on charity card to open modal
            fireEvent.click(screen.getByText('Save the Whales'));

            // Wait for modal and click approve
            await waitFor(() => {
                const approveButton = screen.getByText('Approve');
                fireEvent.click(approveButton);
            });

            await waitFor(() => {
                expect(adminService.approveCharity).toHaveBeenCalledWith('1', expect.any(String));
                expect(toast.success).toHaveBeenCalledWith('Charity approved successfully');
            });
        });

        it('should handle approve failure', async () => {
            (adminService.approveCharity as jest.Mock).mockResolvedValue({ success: false });

            render(<CharityVerification />);

            await waitFor(() => {
                fireEvent.click(screen.getByText('Save the Whales'));
            });

            await waitFor(() => {
                fireEvent.click(screen.getByText('Approve'));
            });

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith('Failed to approve charity');
            });
        });

        it('should refresh data after approval', async () => {
            (adminService.approveCharity as jest.Mock).mockResolvedValue({ success: true });

            render(<CharityVerification />);

            await waitFor(() => {
                fireEvent.click(screen.getByText('Save the Whales'));
            });

            await waitFor(() => {
                fireEvent.click(screen.getByText('Approve'));
            });

            await waitFor(() => {
                expect(adminService.getCharities).toHaveBeenCalledTimes(2); // Initial + refresh
            });
        });
    });

    describe('Reject Charity', () => {
        it('should reject charity with notes', async () => {
            (adminService.rejectCharity as jest.Mock).mockResolvedValue({ success: true });

            render(<CharityVerification />);

            await waitFor(() => {
                fireEvent.click(screen.getByText('Save the Whales'));
            });

            // Add rejection notes
            await waitFor(() => {
                const notesInput = screen.getByPlaceholderText(/Add notes/i);
                fireEvent.change(notesInput, { target: { value: 'Invalid documentation' } });
            });

            // Click reject
            const rejectButton = screen.getByText('Reject');
            fireEvent.click(rejectButton);

            await waitFor(() => {
                expect(adminService.rejectCharity).toHaveBeenCalledWith('1', 'Invalid documentation');
                expect(toast.error).toHaveBeenCalledWith('Charity rejected');
            });
        });

        it('should require notes for rejection', async () => {
            render(<CharityVerification />);

            await waitFor(() => {
                fireEvent.click(screen.getByText('Save the Whales'));
            });

            await waitFor(() => {
                const rejectButton = screen.getByText('Reject');
                fireEvent.click(rejectButton);
            });

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith('Please provide a reason for rejection');
                expect(adminService.rejectCharity).not.toHaveBeenCalled();
            });
        });

        it('should handle reject failure', async () => {
            (adminService.rejectCharity as jest.Mock).mockResolvedValue({ success: false });

            render(<CharityVerification />);

            await waitFor(() => {
                fireEvent.click(screen.getByText('Save the Whales'));
            });

            await waitFor(() => {
                const notesInput = screen.getByPlaceholderText(/Add notes/i);
                fireEvent.change(notesInput, { target: { value: 'Test reason' } });
                fireEvent.click(screen.getByText('Reject'));
            });

            await waitFor(() => {
                expect(toast.error).toHaveBeenCalledWith('Failed to reject charity');
            });
        });
    });

    describe('Modal Interaction', () => {
        it('should open modal when clicking charity card', async () => {
            render(<CharityVerification />);

            await waitFor(() => {
                fireEvent.click(screen.getByText('Save the Whales'));
            });

            await waitFor(() => {
                expect(screen.getByText('Ocean Conservation Fund')).toBeInTheDocument();
                expect(screen.getByText('Approve')).toBeInTheDocument();
                expect(screen.getByText('Reject')).toBeInTheDocument();
            });
        });

        it('should close modal when clicking close button', async () => {
            render(<CharityVerification />);

            await waitFor(() => {
                fireEvent.click(screen.getByText('Save the Whales'));
            });

            await waitFor(() => {
                const closeButton = screen.getByRole('button', { name: /close/i });
                fireEvent.click(closeButton);
            });

            await waitFor(() => {
                expect(screen.queryByText('Approve')).not.toBeInTheDocument();
            });
        });

        it('should display verification documents', async () => {
            render(<CharityVerification />);

            await waitFor(() => {
                fireEvent.click(screen.getByText('Save the Whales'));
            });

            await waitFor(() => {
                expect(screen.getByText(/Document 1/i)).toBeInTheDocument();
                expect(screen.getByText(/Document 2/i)).toBeInTheDocument();
            });
        });
    });

    describe('Filtering', () => {
        it('should filter by pending status', async () => {
            render(<CharityVerification />);

            await waitFor(() => {
                const pendingTab = screen.getByText('pending');
                fireEvent.click(pendingTab);
            });

            await waitFor(() => {
                expect(screen.getByText('Save the Whales')).toBeInTheDocument();
                expect(screen.queryByText('Feed the Hungry')).not.toBeInTheDocument();
            });
        });

        it('should filter by verified status', async () => {
            render(<CharityVerification />);

            await waitFor(() => {
                const verifiedTab = screen.getByText('verified');
                fireEvent.click(verifiedTab);
            });

            await waitFor(() => {
                expect(screen.queryByText('Save the Whales')).not.toBeInTheDocument();
                expect(screen.getByText('Feed the Hungry')).toBeInTheDocument();
            });
        });

        it('should show all charities when "all" filter is selected', async () => {
            render(<CharityVerification />);

            await waitFor(() => {
                const allTab = screen.getByText('all');
                fireEvent.click(allTab);
            });

            await waitFor(() => {
                expect(screen.getByText('Save the Whales')).toBeInTheDocument();
                expect(screen.getByText('Feed the Hungry')).toBeInTheDocument();
            });
        });
    });

    describe('Loading States', () => {
        it('should show loading spinner while fetching', () => {
            render(<CharityVerification />);
            expect(screen.getByRole('status')).toBeInTheDocument();
        });

        it('should hide loading spinner after data loads', async () => {
            render(<CharityVerification />);

            await waitFor(() => {
                expect(screen.queryByRole('status')).not.toBeInTheDocument();
            });
        });

        it('should disable buttons while processing', async () => {
            (adminService.approveCharity as jest.Mock).mockImplementation(
                () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
            );

            render(<CharityVerification />);

            await waitFor(() => {
                fireEvent.click(screen.getByText('Save the Whales'));
            });

            await waitFor(() => {
                const approveButton = screen.getByText('Approve');
                fireEvent.click(approveButton);
            });

            await waitFor(() => {
                expect(screen.getByText('Processing...')).toBeInTheDocument();
            });
        });
    });
});
