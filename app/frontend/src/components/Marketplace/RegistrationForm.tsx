import React, { useState } from 'react';
import { useWeb3 } from '@/context/Web3Context';

interface RegistrationFormProps {
  onRegistrationComplete: () => void;
  role: 'buyer' | 'seller';
}

const RegistrationForm: React.FC<RegistrationFormProps> = ({ onRegistrationComplete, role }) => {
  const { address, isConnected } = useWeb3();
  const [formData, setFormData] = useState({
    email: '',
    legalName: '',
    country: '',
    shippingAddress: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: ''
    },
    billingAddress: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: ''
    }
  });
  const [useSameAddress, setUseSameAddress] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddressChange = (addressType: 'shippingAddress' | 'billingAddress', e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [addressType]: {
        ...prev[addressType],
        [name]: value
      }
    }));
  };

  const handleUseSameAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUseSameAddress(e.target.checked);
    if (e.target.checked) {
      setFormData(prev => ({
        ...prev,
        billingAddress: { ...prev.shippingAddress }
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // If using the same address for billing, make sure they're synced
      const submissionData = {
        ...formData,
        billingAddress: useSameAddress ? formData.shippingAddress : formData.billingAddress
      };

      // In a real implementation, you would call your API here
      const endpoint = role === 'seller' 
        ? '/api/marketplace/registration/register/seller'
        : '/api/marketplace/registration/register/buyer';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Include authentication header if needed
        },
        body: JSON.stringify({
          walletAddress: address,
          ...submissionData
        })
      });

      if (!response.ok) {
        throw new Error(`Registration failed: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Registration successful:', result);
      onRegistrationComplete();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || 'Registration failed');
      } else {
        setError('Registration failed');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Connect Wallet Required</h2>
        <p className="text-gray-600 mb-4">
          Please connect your wallet to register as a {role}.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4">
        Register as a {role.charAt(0).toUpperCase() + role.slice(1)}
      </h2>
      
      {error && (
        <div className="bg-red-50 text-red-700 p-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
            Email (Optional)
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="your@email.com"
          />
        </div>
        
        {role === 'seller' && (
          <>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="legalName">
                Legal Name
              </label>
              <input
                type="text"
                id="legalName"
                name="legalName"
                value={formData.legalName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Your legal name"
                required
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="country">
                Country
              </label>
              <select
                id="country"
                name="country"
                value={formData.country}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Country</option>
                <option value="US">United States</option>
                <option value="CA">Canada</option>
                <option value="GB">United Kingdom</option>
                <option value="AU">Australia</option>
                <option value="DE">Germany</option>
                <option value="FR">France</option>
                {/* Add more countries as needed */}
              </select>
            </div>
          </>
        )}
        
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Shipping Address</h3>
          
          <div className="mb-3">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="street">
              Street Address
            </label>
            <input
              type="text"
              id="street"
              name="street"
              value={formData.shippingAddress.street}
              onChange={(e) => handleAddressChange('shippingAddress', e)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="123 Main St"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="city">
                City
              </label>
              <input
                type="text"
                id="city"
                name="city"
                value={formData.shippingAddress.city}
                onChange={(e) => handleAddressChange('shippingAddress', e)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="City"
              />
            </div>
            
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="state">
                State/Province
              </label>
              <input
                type="text"
                id="state"
                name="state"
                value={formData.shippingAddress.state}
                onChange={(e) => handleAddressChange('shippingAddress', e)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="State"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="zipCode">
                ZIP/Postal Code
              </label>
              <input
                type="text"
                id="zipCode"
                name="zipCode"
                value={formData.shippingAddress.zipCode}
                onChange={(e) => handleAddressChange('shippingAddress', e)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="12345"
              />
            </div>
            
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="addressCountry">
                Country
              </label>
              <input
                type="text"
                id="addressCountry"
                name="country"
                value={formData.shippingAddress.country}
                onChange={(e) => handleAddressChange('shippingAddress', e)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Country"
              />
            </div>
          </div>
        </div>
        
        <div className="mb-6">
          <div className="flex items-center mb-3">
            <input
              type="checkbox"
              id="useSameAddress"
              checked={useSameAddress}
              onChange={handleUseSameAddressChange}
              className="mr-2"
            />
            <label htmlFor="useSameAddress" className="text-gray-700 font-medium">
              Use same address for billing
            </label>
          </div>
          
          {!useSameAddress && (
            <>
              <h3 className="text-lg font-semibold mb-3">Billing Address</h3>
              
              <div className="mb-3">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="billingStreet">
                  Street Address
                </label>
                <input
                  type="text"
                  id="billingStreet"
                  name="street"
                  value={formData.billingAddress.street}
                  onChange={(e) => handleAddressChange('billingAddress', e)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="123 Main St"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="billingCity">
                    City
                  </label>
                  <input
                    type="text"
                    id="billingCity"
                    name="city"
                    value={formData.billingAddress.city}
                    onChange={(e) => handleAddressChange('billingAddress', e)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="City"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="billingState">
                    State/Province
                  </label>
                  <input
                    type="text"
                    id="billingState"
                    name="state"
                    value={formData.billingAddress.state}
                    onChange={(e) => handleAddressChange('billingAddress', e)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="State"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="billingZipCode">
                    ZIP/Postal Code
                  </label>
                  <input
                    type="text"
                    id="billingZipCode"
                    name="zipCode"
                    value={formData.billingAddress.zipCode}
                    onChange={(e) => handleAddressChange('billingAddress', e)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="12345"
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="billingAddressCountry">
                    Country
                  </label>
                  <input
                    type="text"
                    id="billingAddressCountry"
                    name="country"
                    value={formData.billingAddress.country}
                    onChange={(e) => handleAddressChange('billingAddress', e)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Country"
                  />
                </div>
              </div>
            </>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
          >
            {loading ? 'Registering...' : `Register as ${role.charAt(0).toUpperCase() + role.slice(1)}`}
          </button>
          
          <button
            type="button"
            onClick={onRegistrationComplete}
            className="text-gray-600 hover:text-gray-800 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default RegistrationForm;