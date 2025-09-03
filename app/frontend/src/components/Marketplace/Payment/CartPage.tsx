import React, { useState } from 'react';
import { X, Plus, Minus, ShoppingCart, Shield, Vote } from 'lucide-react';

// Sample cart data
const cartItems = [
  {
    id: '1',
    title: 'Handcrafted Wooden Watch',
    price: '45.99',
    currency: 'USDC',
    fiatPrice: '$45.99',
    image: '/images/sample-product-1.jpg',
    quantity: 1,
    seller: 'EcoCrafts',
    badges: ['DAO-approved', 'Escrow-protected']
  },
  {
    id: '2',
    title: 'Premium Coffee Subscription',
    price: '29.99',
    currency: 'USDC',
    fiatPrice: '$29.99',
    image: '/images/sample-product-4.jpg',
    quantity: 2,
    seller: 'CoffeeRoasters',
    badges: ['Subscription', 'DAO-approved']
  }
];

const CartPage = () => {
  const [items, setItems] = useState(cartItems);
  
  const updateQuantity = (id: string, quantity: number) => {
    if (quantity < 1) return;
    setItems(items.map(item => 
      item.id === id ? { ...item, quantity } : item
    ));
  };
  
  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };
  
  const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
  const shipping = 5.99;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;
  
  const handleCheckout = () => {
    // Checkout functionality
    console.log('Proceeding to checkout');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Shopping Cart</h1>
      
      {items.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <ShoppingCart size={48} className="mx-auto text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Your cart is empty</h2>
          <p className="text-gray-600 mb-6">Looks like you haven't added anything to your cart yet</p>
          <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors">
            Continue Shopping
          </button>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Cart Items */}
          <div className="flex-1">
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              {items.map((item) => (
                <div key={item.id} className="border-b border-gray-200 last:border-b-0">
                  <div className="p-6 flex flex-col sm:flex-row">
                    <div className="flex-shrink-0 mb-4 sm:mb-0 sm:mr-6">
                      <img 
                        src={item.image} 
                        alt={item.title} 
                        className="w-24 h-24 object-contain rounded-md"
                      />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-800">{item.title}</h3>
                          <p className="text-sm text-gray-600">Sold by {item.seller}</p>
                          
                          <div className="flex flex-wrap gap-1 mt-2">
                            {item.badges.map((badge, index) => (
                              <span 
                                key={index} 
                                className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded flex items-center"
                              >
                                {badge.includes('Escrow') && <Shield size={12} className="mr-1" />}
                                {badge.includes('DAO') && <Vote size={12} className="mr-1" />}
                                {badge}
                              </span>
                            ))}
                          </div>
                        </div>
                        
                        <div className="mt-4 sm:mt-0 text-right">
                          <div className="font-bold text-gray-900">
                            {item.price} {item.currency}
                          </div>
                          <div className="text-sm text-gray-600">{item.fiatPrice}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center">
                          <button 
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="p-1 border border-gray-300 rounded-md"
                          >
                            <Minus size={16} />
                          </button>
                          <span className="mx-3 w-10 text-center">{item.quantity}</span>
                          <button 
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="p-1 border border-gray-300 rounded-md"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                        
                        <button 
                          onClick={() => removeItem(item.id)}
                          className="text-red-600 hover:text-red-800 flex items-center"
                        >
                          <X size={16} className="mr-1" />
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Order Summary */}
          <div className="w-full lg:w-80 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-24">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Order Summary</h2>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">{subtotal.toFixed(2)} USDC</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-medium">{shipping.toFixed(2)} USDC</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax</span>
                  <span className="font-medium">{tax.toFixed(2)} USDC</span>
                </div>
                <div className="border-t border-gray-200 pt-3 flex justify-between font-semibold">
                  <span>Total</span>
                  <span>{total.toFixed(2)} USDC</span>
                </div>
                <div className="text-sm text-gray-600 text-center">
                  ≈ ${total.toFixed(2)} USD
                </div>
              </div>
              
              <button 
                onClick={handleCheckout}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors mb-4 flex items-center justify-center"
              >
                <Shield size={20} className="mr-2" />
                Proceed to Checkout
              </button>
              
              <div className="text-sm text-gray-600 mb-4">
                <p className="flex items-center mb-1">
                  <Shield size={16} className="mr-2 text-green-500" />
                  Escrow-protected transaction
                </p>
                <p className="flex items-center">
                  <Vote size={16} className="mr-2 text-blue-500" />
                  DAO-governed marketplace
                </p>
              </div>
              
              <div className="border-t border-gray-200 pt-4">
                <h3 className="font-medium text-gray-800 mb-3">Tip & Donate</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Tip seller (optional)</label>
                    <div className="flex">
                      <input 
                        type="number" 
                        placeholder="0.00"
                        className="flex-1 p-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="bg-gray-100 px-3 py-2 border border-l-0 border-gray-300 rounded-r-md">USDC</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-700 mb-1">Donate to DAO treasury (optional)</label>
                    <div className="flex">
                      <input 
                        type="number" 
                        placeholder="0.00"
                        className="flex-1 p-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="bg-gray-100 px-3 py-2 border border-l-0 border-gray-300 rounded-r-md">USDC</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartPage;