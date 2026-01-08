import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Loader2 } from 'lucide-react';

interface CreateOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface ProductPrice {
    name: string;
    price: number;
}

export function CreateOrderModal({ isOpen, onClose, onSuccess }: CreateOrderModalProps) {
    const [loading, setLoading] = useState(false);
    const [products, setProducts] = useState<ProductPrice[]>([]);
    const [fetchingProducts, setFetchingProducts] = useState(false);

    const [email, setEmail] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [countryCode, setCountryCode] = useState('91');
    const [selectedProduct, setSelectedProduct] = useState('');
    const [selectedPrice, setSelectedPrice] = useState<number | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchProducts();
        }
    }, [isOpen]);

    const fetchProducts = async () => {
        setFetchingProducts(true);
        try {
            // Fetch distinct products and their latest amounts
            // Since we can't easily do DISTINCT ON in client query without some logic,
            // we'll fetch a chunk of recent successful payments and extract unique products.
            const { data, error } = await supabase
                .from('payments_kb_all')
                .select('product, amount')
                .eq('status', 'SUCCESS')
                .order('created_at', { ascending: false })
                .limit(200);

            if (error) throw error;

            if (data) {
                const productMap = new Map<string, number>();
                data.forEach((item) => {
                    if (item.product && item.amount && !productMap.has(item.product)) {
                        productMap.set(item.product, item.amount);
                    }
                });

                const uniqueProducts = Array.from(productMap.entries()).map(([name, price]) => ({
                    name,
                    price
                })).sort((a, b) => a.name.localeCompare(b.name));

                setProducts(uniqueProducts);
            }
        } catch (error) {
            console.error('Error fetching products:', error);
        } finally {
            setFetchingProducts(false);
        }
    };

    const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const productName = e.target.value;
        setSelectedProduct(productName);
        const product = products.find(p => p.name === productName);
        if (product) {
            setSelectedPrice(product.price);
        } else {
            setSelectedPrice(null);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProduct || !selectedPrice || !email || !phoneNumber) return;

        setLoading(true);

        try {
            // 1. Generate Order ID
            // Format: CFPay_{product_slug}_{random_hex}_{timestamp}
            const productSlug = selectedProduct.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 10);
            const randomHex = Math.random().toString(16).substring(2, 10);
            const timestamp = Date.now();
            const razorpayOrderId = `CFPay_${productSlug}_${randomHex}_${timestamp}`;

            // 2. Format Phone Number
            // Combine country code and number, ensure only digits
            const fullPhoneString = `${countryCode}${phoneNumber}`.replace(/\D/g, '');
            const phoneNumeric = Number(fullPhoneString);

            // 3. Insert into Supabase
            const { error } = await supabase
                .from('payments_kb_all')
                .insert({
                    amount: selectedPrice,
                    currency: 'INR',
                    status: 'SUCCESS',
                    razorpay_order_id: razorpayOrderId,
                    phone: phoneNumeric,
                    email: email,
                    product: selectedProduct,
                    created_at: new Date().toISOString(),
                    note: 'international payment' // Auto-generated note as requested
                });

            if (error) throw error;

            onSuccess();
            onClose();
            // Reset form
            setEmail('');
            setPhoneNumber('');
            setSelectedProduct('');
            setSelectedPrice(null);
        } catch (err) {
            console.error('Error creating order:', err);
            alert('Failed to create order. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900">Create New Order</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Select Product
                        </label>
                        <select
                            value={selectedProduct}
                            onChange={handleProductChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent bg-white"
                            required
                        >
                            <option value="">Choose a product...</option>
                            {products.map((p) => (
                                <option key={p.name} value={p.name}>
                                    {p.name} - ₹{p.price}
                                </option>
                            ))}
                        </select>
                        {fetchingProducts && <p className="text-xs text-gray-500 mt-1">Loading products...</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email Address
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                            placeholder="customer@example.com"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Phone Number
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={countryCode}
                                onChange={(e) => setCountryCode(e.target.value.replace(/\D/g, ''))}
                                className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent text-center"
                                placeholder="CC"
                                title="Country Code"
                                required
                            />
                            <input
                                type="tel"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                                placeholder="Mobile number"
                                required
                            />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Format: Country Code (without +) + Number
                        </p>
                    </div>

                    {selectedProduct && selectedPrice !== null && (
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 mt-4">
                            <div className="flex justify-between text-sm text-gray-600 mb-1">
                                <span>Product</span>
                                <span className="font-medium text-gray-900">{selectedProduct}</span>
                            </div>
                            <div className="flex justify-between text-sm text-gray-600 mb-1">
                                <span>Amount (INR)</span>
                                <span className="font-medium text-gray-900">₹{selectedPrice}</span>
                            </div>
                            <div className="flex justify-between text-sm text-gray-600">
                                <span>Status</span>
                                <span className="font-medium text-green-600">SUCCESS</span>
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || !selectedProduct}
                        className="w-full mt-6 bg-rose-500 text-white py-2.5 rounded-lg font-medium hover:bg-rose-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Creating Order...
                            </>
                        ) : (
                            'Create Order'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
