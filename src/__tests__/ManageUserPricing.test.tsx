import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ManageUserPricing from '../components/ManageUserPricing';
import { act } from 'react-dom/test-utils';

// Mock fetch
global.fetch = jest.fn();

describe('ManageUserPricing Component', () => {
  const mockProps = {
    userId: '1',
    userName: 'Test User',
    userEmail: 'test@example.com',
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful pricing profiles fetch
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url === '/api/admin/pricing-profiles') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            profiles: [
              {
                id: '1',
                name: 'Standard',
                description: 'Standard pricing',
                basePrice: 0.1, // 10% discount
                dataPricePerGB: 2.5,
                minimumCharge: 1.0,
                isActive: true,
                isTiered: false
              },
              {
                id: '2',
                name: 'Premium',
                description: 'Premium pricing',
                basePrice: 0.2, // 20% discount
                dataPricePerGB: 2.0,
                minimumCharge: 0.5,
                isActive: true,
                isTiered: false
              }
            ]
          })
        });
      } 
      else if (url === `/api/admin/users/1/pricing-profiles`) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            profiles: []
          })
        });
      }
      else if (url === '/api/admin/user-profile-assignment') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            message: 'User assigned to pricing profile successfully',
            assignment: { id: 1, userId: 1, profileId: 1 }
          })
        });
      }
      return Promise.reject(new Error('Not mocked'));
    });
  });

  it('renders loading state initially', async () => {
    render(<ManageUserPricing {...mockProps} />);
    expect(screen.getByText('Loading pricing profiles...')).toBeInTheDocument();
  });

  it('displays no pricing profile assigned message when user has no profile', async () => {
    await act(async () => {
      render(<ManageUserPricing {...mockProps} />);
    });

    await waitFor(() => {
      expect(screen.getByText('No pricing profile assigned. Using default pricing.')).toBeInTheDocument();
    });
  });

  it('allows selecting and assigning a pricing profile', async () => {
    await act(async () => {
      render(<ManageUserPricing {...mockProps} />);
    });

    await waitFor(() => {
      expect(screen.getByText('Select a pricing profile')).toBeInTheDocument();
    });

    // Open the dropdown
    fireEvent.click(screen.getByRole('combobox'));
    
    // Select the Standard profile
    await waitFor(() => {
      expect(screen.getByText('Standard')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Standard'));
    
    // Click assign button
    fireEvent.click(screen.getByText('Assign Profile'));
    
    // Verify fetch was called with correct parameters
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/admin/user-profile-assignment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: '1',
          profileId: '1'
        })
      });
    });
  });

  it('displays profile information when user has a profile assigned', async () => {
    // Mock user with assigned profile
    (global.fetch as jest.Mock).mockImplementationOnce((url) => {
      if (url === '/api/admin/pricing-profiles') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            profiles: [
              {
                id: '1',
                name: 'Standard',
                description: 'Standard pricing',
                basePrice: 0.1,
                dataPricePerGB: 2.5,
                minimumCharge: 1.0,
                isActive: true,
                isTiered: false
              }
            ]
          })
        });
      }
      return Promise.reject(new Error('Not mocked'));
    }).mockImplementationOnce((url) => {
      if (url === `/api/admin/users/1/pricing-profiles`) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            profiles: [
              {
                id: '1',
                name: 'Standard',
                description: 'Standard pricing',
                basePrice: 0.1,
                dataPricePerGB: 2.5,
                minimumCharge: 1.0,
                isActive: true,
                isTiered: false
              }
            ]
          })
        });
      }
      return Promise.reject(new Error('Not mocked'));
    });
    
    await act(async () => {
      render(<ManageUserPricing {...mockProps} />);
    });

    // Check that profile data is displayed
    await waitFor(() => {
      expect(screen.getByText('Current Pricing Profile')).toBeInTheDocument();
      expect(screen.getByText('Standard')).toBeInTheDocument();
      expect(screen.getByText('Standard pricing')).toBeInTheDocument();
      expect(screen.getByText('Base Cost/GB:')).toBeInTheDocument();
      expect(screen.getByText('$2.50')).toBeInTheDocument();
      expect(screen.getByText('Discount:')).toBeInTheDocument();
      expect(screen.getByText('10.00%')).toBeInTheDocument();
    });
  });
});
