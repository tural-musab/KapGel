'use client';
import Image from 'next/image';
import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  MapPin,
  Clock,
  Star,
  ShoppingBag,
  Bike,
  Package,
  ChevronRight,
  Menu,
  X,
  Play,
  Shield,
  Zap,
  Heart,
  TrendingUp,
  Filter,
  Grid,
  List,
  User,
  Bell,
  Truck,
  CheckCircle,
  Phone,
  MessageCircle,
} from 'lucide-react';

type TimelineStep = 'order_placed' | 'preparing' | 'on_the_way' | 'arriving' | 'delivered';

interface TimelineEntry {
  step: TimelineStep;
  time: string;
  message?: string;
}

interface FeaturedVendor {
  id: number;
  name: string;
  rating: number;
  category: string;
  deliveryTime: number;
  image: string;
  minOrder: number;
  badge: string | null;
  description: string;
  address: string;
  deliveryRadius: number;
  totalOrders: number;
  deliveryFee: number;
  openingTime: string;
  closingTime: string;
  cuisines: string[];
  isFavorite: boolean;
}

interface CourierState {
  id: number;
  name: string;
  avatar: string;
  rating: number;
  distance: number;
  time: number;
  lat: number;
  lng: number;
  status: 'on_the_way' | 'arriving' | 'delivered';
  vehicle: 'motorcycle' | 'bicycle' | 'car';
}

interface SimulatedOrder {
  id: number;
  vendor?: FeaturedVendor;
  status: TimelineStep;
  estimatedTime: number;
}

interface City {
  id: number;
  name: string;
  lat: number;
  lng: number;
  districts: string[];
}

interface FeatureTile {
  icon: React.ReactNode;
  title: string;
  desc: string;
  gradient: string;
}

interface HighlightStat {
  number: string;
  label: string;
}

interface FilterState {
  category: string;
  rating: number;
  deliveryTime: string;
}

const KapgelAdvancedLanding = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'restaurants' | 'courier' | 'markets'>('restaurants');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterState>({ category: 'all', rating: 0, deliveryTime: 'all' });
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [userLocation] = useState({ lat: 41.0082, lng: 28.9784 });
  const [orderTimeline, setOrderTimeline] = useState<TimelineEntry[]>([]);
  const [currentOrder, setCurrentOrder] = useState<SimulatedOrder | null>(null);
  const [activeCourier, setActiveCourier] = useState<CourierState | null>(null);
  const mapRef = useRef<HTMLDivElement | null>(null);

  // Mock data with more detail
  const cities: City[] = [
    { id: 1, name: 'İstanbul', lat: 41.0082, lng: 28.9784, districts: ['Kadıköy', 'Beşiktaş', 'Şişli', 'Levent', 'Bakırköy'] },
    { id: 2, name: 'Ankara', lat: 39.9334, lng: 32.8597, districts: ['Çankaya', 'Kızılay', 'Yenişehir', 'Sıhhiye', 'Ulus'] },
    { id: 3, name: 'İzmir', lat: 38.4237, lng: 27.1428, districts: ['Alsancak', 'Konak', 'Bornova', 'Karşıyaka', 'Çeşme'] },
    { id: 4, name: 'Bursa', lat: 40.1826, lng: 29.0665, districts: ['Osmangazi', 'Yıldırım', 'Nilüfer', 'Gemlik', 'Mustafakemalpaşa'] },
    { id: 5, name: 'Antalya', lat: 36.8550, lng: 30.7042, districts: ['Konyaaltı', 'Muratpaşa', 'Kepez', 'Lara', 'Kale'] },
    { id: 6, name: 'Adana', lat: 37.0000, lng: 35.3213, districts: ['Seyhan', 'Yüreğir', 'Çukurova', 'Sarıçam', 'Feke'] },
  ];

  const categories: { id: string; name: string; icon: string }[] = [
    { id: 'all', name: 'Tümü', icon: '🍽️' },
    { id: 'fastfood', name: 'Fast Food', icon: '🍔' },
    { id: 'italian', name: 'İtalyan', icon: '🍕' },
    { id: 'asian', name: 'Asya', icon: '🍱' },
    { id: 'healthy', name: 'Sağlıklı', icon: '🥗' },
    { id: 'dessert', name: 'Tatlı', icon: '🍰' },
    { id: 'drinks', name: 'İçecek', icon: '🥤' },
    { id: 'grocery', name: 'Market', icon: '🛒' },
  ];

  const featuredVendors: FeaturedVendor[] = [
    { 
      id: 1,
      name: 'Burger House Premium', 
      rating: 4.8, 
      category: 'fastfood', 
      deliveryTime: 25, 
      image: '🍔', 
      minOrder: 50, 
      badge: 'Popüler', 
      description: 'En taze malzemelerle hazırlanan özel burgerler',
      address: 'Kadıköy, İstanbul',
      deliveryRadius: 5,
      totalOrders: 12000,
      deliveryFee: 8,
      openingTime: '10:00',
      closingTime: '23:00',
      cuisines: ['Amerikan', 'Fast Food'],
      isFavorite: true
    },
    { 
      id: 2,
      name: 'Pizza Master', 
      rating: 4.9, 
      category: 'italian', 
      deliveryTime: 30, 
      image: '🍕', 
      minOrder: 60, 
      badge: 'Yeni', 
      description: 'Geleneksel pizza hamurunu kendimiz açıyoruz',
      address: 'Beşiktaş, İstanbul',
      deliveryRadius: 4,
      totalOrders: 8500,
      deliveryFee: 10,
      openingTime: '11:00',
      closingTime: '00:00',
      cuisines: ['İtalyan', 'Fast Food'],
      isFavorite: false
    },
    { 
      id: 3,
      name: 'Sushi Garden', 
      rating: 4.7, 
      category: 'asian', 
      deliveryTime: 35, 
      image: '🍱', 
      minOrder: 80, 
      badge: null, 
      description: 'Japon mutfağının en kaliteli ürünleri',
      address: 'Şişli, İstanbul',
      deliveryRadius: 6,
      totalOrders: 5200,
      deliveryFee: 12,
      openingTime: '12:00',
      closingTime: '22:00',
      cuisines: ['Japon', 'Asya'],
      isFavorite: true
    },
    { 
      id: 4,
      name: 'Fresh Market', 
      rating: 4.6, 
      category: 'grocery', 
      deliveryTime: 20, 
      image: '🛒', 
      minOrder: 30, 
      badge: 'Hızlı', 
      description: 'Yerel üreticilerden taze ürünler',
      address: 'Levent, İstanbul',
      deliveryRadius: 3,
      totalOrders: 21000,
      deliveryFee: 5,
      openingTime: '08:00',
      closingTime: '23:30',
      cuisines: ['Market', 'Manav'],
      isFavorite: false
    },
  ];

  const features: FeatureTile[] = [
    { icon: <Zap className="w-8 h-8" />, title: 'Süper Hızlı Teslimat', desc: 'Ortalama 20 dakikada kapınızda', gradient: 'from-yellow-400 to-orange-500' },
    { icon: <Shield className="w-8 h-8" />, title: 'Güvenli Alışveriş', desc: 'Güvenli ödeme ve kurye takibi', gradient: 'from-blue-400 to-indigo-500' },
    { icon: <Clock className="w-8 h-8" />, title: '24/7 Canlı Takip', desc: 'Siparişinizi anında takip edin', gradient: 'from-purple-400 to-pink-500' },
    { icon: <Heart className="w-8 h-8" />, title: 'Yerel İşletmeler', desc: 'Mahallenizdeki işletmeleri destekleyin', gradient: 'from-green-400 to-teal-500' },
    { icon: <Truck className="w-8 h-8" />, title: 'Profesyonel Kurye', desc: 'Eğitimli ve güvenilir kuryeler', gradient: 'from-red-400 to-orange-500' },
    { icon: <CheckCircle className="w-8 h-8" />, title: 'Kalite Garantisi', desc: 'Her sipariş kalite kontrolünden geçer', gradient: 'from-cyan-400 to-blue-500' },
  ];

  const stats: HighlightStat[] = [
    { number: '500+', label: 'İşletme' },
    { number: '50K+', label: 'Mutlu Müşteri' },
    { number: '100K+', label: 'Sipariş' },
    { number: '4.9', label: 'Ortalama Puan' },
    { number: '99%', label: 'Müşteri Memnuniyeti' },
    { number: '24/7', label: 'Hizmet' },
  ];

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 24);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll);

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Simulate real-time courier movement
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentOrder && activeCourier) {
        setOrderTimeline((prev) => {
          const lastEvent = prev[prev.length - 1] ?? {
            step: 'order_placed' as TimelineStep,
            time: new Date().toLocaleTimeString(),
          };
          const nextSteps: TimelineStep[] = ['preparing', 'on_the_way', 'arriving', 'delivered'];
          const currentIndex = nextSteps.indexOf(lastEvent.step);

          if (currentIndex < nextSteps.length - 1) {
            return [
              ...prev,
              {
                step: nextSteps[currentIndex + 1],
                time: new Date().toLocaleTimeString(),
              },
            ];
          }
          return prev;
        });
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [currentOrder, activeCourier]);

  // Simulate courier movement on map
  useEffect(() => {
    if (mapRef.current) {
      // This would be replaced with actual Map API integration
      // For now we'll just simulate movement
      setActiveCourier({
        id: 1,
        name: 'Ahmet Yılmaz',
        avatar: '👨‍✈️',
        rating: 4.8,
        distance: 1.2,
        time: 8,
        lat: userLocation.lat + (Math.random() * 0.01 - 0.005),
        lng: userLocation.lng + (Math.random() * 0.01 - 0.005),
        status: 'on_the_way',
        vehicle: 'motorcycle'
      });
    }
  }, [userLocation]);

  const filteredVendors = featuredVendors.filter(vendor => {
    const matchesCategory = filters.category === 'all' || vendor.category === filters.category;
    const matchesRating = vendor.rating >= filters.rating;
    const matchesDeliveryTime = filters.deliveryTime === 'all' || vendor.deliveryTime <= parseInt(filters.deliveryTime) || filters.deliveryTime === 'fast';
    
    const matchesSearch = !searchQuery || 
      vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vendor.cuisines.some(c => c.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesCategory && matchesRating && matchesDeliveryTime && matchesSearch;
  });

  const startOrder = (vendorId: number) => {
    const vendor = featuredVendors.find((v) => v.id === vendorId);
    setCurrentOrder({
      id: Date.now(),
      vendor: vendor,
      status: 'preparing',
      estimatedTime: vendor?.deliveryTime ?? 0,
    });
    
    setOrderTimeline([{
      step: 'order_placed',
      time: new Date().toLocaleTimeString(),
      message: 'Siparişiniz alındı ve hazırlanmaya başlandı'
    }]);
  };

  const toggleFavorite = (vendorId: number) => {
    // In a real app, this would update the backend
    console.debug('toggleFavorite', vendorId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50">
      {/* Notification Banner */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-center py-2 text-sm">
        🎉 Yeni özellik: Canlı kurye konumu artık haritada! Daha hızlı teslimat için uygulamayı indirin →
      </div>

      {/* Navigation */}
      <nav className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white shadow-lg' : 'bg-white/80 backdrop-blur-sm'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <div className="bg-gradient-to-r from-orange-500 to-red-500 p-2 rounded-xl">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                  KapGel
                </h1>
                <p className="text-xs text-gray-600">Gönder Gelsin</p>
              </div>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#" className="text-gray-700 hover:text-orange-600 font-medium transition flex items-center">
                <MapPin className="w-4 h-4 mr-1" /> Mahalleniz
              </a>
              <a href="#" className="text-gray-700 hover:text-orange-600 font-medium transition flex items-center">
                <Bike className="w-4 h-4 mr-1" /> Kurye Ol
              </a>
              <a href="#" className="text-gray-700 hover:text-orange-600 font-medium transition flex items-center">
                <ShoppingBag className="w-4 h-4 mr-1" /> İşletme Ol
              </a>
              
              <div className="flex items-center space-x-4">
                <button className="p-2 text-gray-700 hover:text-orange-600">
                  <Bell className="w-5 h-5" />
                </button>
                <button className="p-2 text-gray-700 hover:text-orange-600">
                  <User className="w-5 h-5" />
                </button>
                <button className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-2 rounded-full font-medium hover:shadow-lg transition transform hover:scale-105 flex items-center space-x-2">
                  <span>Sipariş Ver</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-t">
            <div className="px-4 py-3 space-y-3">
              <a href="#" className="block text-gray-700 hover:text-orange-600 font-medium flex items-center">
                <MapPin className="w-4 h-4 mr-2" /> Mahalleniz
              </a>
              <a href="#" className="block text-gray-700 hover:text-orange-600 font-medium flex items-center">
                <Bike className="w-4 h-4 mr-2" /> Kurye Ol
              </a>
              <a href="#" className="block text-gray-700 hover:text-orange-600 font-medium flex items-center">
                <ShoppingBag className="w-4 h-4 mr-2" /> İşletme Ol
              </a>
              <div className="flex space-x-2 pt-2">
                <button className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 rounded-full font-medium">
                  <User className="w-4 h-4 inline mr-1" /> Profil
                </button>
                <button className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-full font-medium">
                  <Bell className="w-4 h-4 inline mr-1" /> Bildirim
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-12 items-center">
            <div className="lg:col-span-2 space-y-8">
              <div className="space-y-4">
                <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-orange-100 to-red-100 px-4 py-2 rounded-full">
                  <TrendingUp className="w-4 h-4 text-orange-600" />
                  <span className="text-sm font-medium text-orange-600">Türkiye&apos;nin Yeni Nesil Teslimat Platformu</span>
                </div>
                
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                  Yerel Lezzetler
                  <span className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent block"> Kapınızda</span>
                </h1>
                
                <p className="text-lg md:text-xl text-gray-600 max-w-2xl">
                  Mahallenizdeki restoranlar ve marketlerden hızlı teslimat. Siparişinizi canlı takip edin, kuryenizi haritada görün.
                </p>
              </div>

              {/* Search Box */}
              <div className="bg-white rounded-2xl shadow-xl p-2 border border-gray-100">
                <div className="flex flex-col lg:flex-row gap-2">
                  <div className="flex-1 flex items-center px-4 py-3 border-b lg:border-b-0 lg:border-r">
                    <MapPin className="w-5 h-5 text-gray-400 mr-2" />
                    <select 
                      value={selectedCity}
                      onChange={(e) => setSelectedCity(e.target.value)}
                      className="flex-1 outline-none text-gray-700 font-medium"
                    >
                      <option value="">Şehir Seçin</option>
                      {cities.map(city => (
                        <option key={city.id} value={city.id}>{city.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex-1 flex items-center px-4 py-3">
                    <Search className="w-5 h-5 text-gray-400 mr-2" />
                    <input 
                      type="text" 
                      placeholder="Restoran, ürün veya kategori ara..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="flex-1 outline-none text-gray-700"
                    />
                  </div>
                  
                  <button className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-8 py-3 rounded-xl font-medium hover:shadow-lg transition transform hover:scale-105 flex items-center justify-center space-x-2">
                    <span>Ara</span>
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Category Filter */}
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setFilters({...filters, category: cat.id})}
                    className={`flex items-center space-x-1 px-4 py-2 rounded-full text-sm font-medium transition ${
                      filters.category === cat.id
                        ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.name}</span>
                  </button>
                ))}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {stats.map((stat, idx) => (
                  <div key={idx} className="bg-white rounded-xl p-4 shadow-sm text-center border border-gray-100">
                    <div className="text-2xl font-bold text-orange-600">{stat.number}</div>
                    <div className="text-xs text-gray-600">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Hero Map & Order Tracking */}
            <div className="relative">
              <div className="bg-gradient-to-br from-orange-400 to-red-500 rounded-3xl p-6 shadow-2xl">
                <div className="bg-white rounded-2xl p-5 space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-2xl">
                        🍕
                      </div>
                      <div>
                        <div className="font-semibold">Pizza Master</div>
                        <div className="text-sm text-gray-600">Hazırlanıyor...</div>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-orange-600">{currentOrder?.estimatedTime || 25} dk</div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        orderTimeline.some(e => e.step === 'order_placed') ? 'bg-green-500' : 'bg-gray-200'
                      }`}>
                        <div className={`w-3 h-3 rounded-full ${
                          orderTimeline.some(e => e.step === 'order_placed') ? 'bg-white' : 'bg-gray-400'
                        }`}></div>
                      </div>
                      <div className={`flex-1 h-1 ${
                        orderTimeline.some(e => e.step === 'preparing') ? 'bg-green-500' : 'bg-gray-200'
                      }`}></div>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        orderTimeline.some(e => e.step === 'preparing') ? 'bg-orange-500' : 
                        orderTimeline.some(e => e.step === 'order_placed') ? 'bg-gray-200' : 'bg-gray-200'
                      }`}>
                        <Bike className={`w-4 h-4 ${
                          orderTimeline.some(e => e.step === 'preparing') ? 'text-white' : 'text-gray-400'
                        }`} />
                      </div>
                      <div className={`flex-1 h-1 ${
                        orderTimeline.some(e => e.step === 'on_the_way') ? 'bg-orange-500' : 
                        orderTimeline.some(e => e.step === 'preparing') ? 'bg-gray-200' : 'bg-gray-200'
                      }`}></div>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        orderTimeline.some(e => e.step === 'delivered') ? 'bg-blue-500' : 
                        orderTimeline.some(e => e.step === 'arriving') ? 'bg-red-500' : 'bg-gray-200'
                      }`}>
                        <div className={`w-3 h-3 rounded-full ${
                          orderTimeline.some(e => e.step === 'delivered') ? 'bg-white' : 
                          orderTimeline.some(e => e.step === 'arriving') ? 'bg-white' : 'bg-gray-400'
                        }`}></div>
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>Sipariş</span>
                      <span>Hazırlanıyor</span>
                      <span>Teslim Edildi</span>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 flex items-center space-x-3">
                    <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-xl">
                      👨‍✈️
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">Ahmet Yılmaz</div>
                      <div className="text-sm text-gray-600 flex items-center">
                        <Bike className="w-4 h-4 mr-1" />
                        1.2 km uzakta • 8 dk
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button className="bg-white p-2 rounded-full shadow-sm">
                        <Phone className="w-4 h-4 text-gray-600" />
                      </button>
                      <button className="bg-white p-2 rounded-full shadow-sm">
                        <MessageCircle className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <button className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white py-2 rounded-xl font-medium hover:shadow-lg transition">
                      Canlı Takip Et
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Floating Elements */}
              <div className="absolute -top-4 -right-4 bg-white rounded-2xl shadow-xl p-4 animate-bounce">
                <div className="text-3xl">⚡</div>
                <div className="text-xs font-semibold">Hızlı Teslimat</div>
              </div>
              
              <div className="absolute -bottom-4 -left-4 bg-white rounded-2xl shadow-xl p-4">
                <div className="flex items-center space-x-2">
                  <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  <span className="font-bold">4.9</span>
                </div>
                <div className="text-xs text-gray-600">Müşteri Puanı</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Neden <span className="text-orange-600">KapGel</span>?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">Yerel işletmeleri destekleyen, gelişmiş teknolojiyle çalışan en güvenilir platform</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <div key={idx} className="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 group">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300 bg-gradient-to-r ${feature.gradient}`}>
                  <div className="text-white">
                    {feature.icon}
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Vendors */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-orange-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-12">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-2">Öne Çıkan İşletmeler</h2>
              <p className="text-xl text-gray-600">Mahallenizdeki en sevilen mekanlar</p>
            </div>
            
            <div className="flex flex-wrap gap-3 mt-4 md:mt-0">
              <div className="flex space-x-2 bg-white rounded-full p-1 shadow-md">
                <button 
                  onClick={() => setActiveTab('restaurants')}
                  className={`px-6 py-2 rounded-full font-medium transition ${
                    activeTab === 'restaurants' 
                      ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white' 
                      : 'text-gray-600 hover:text-orange-600'
                  }`}
                >
                  🍔 Restoranlar
                </button>
                <button 
                  onClick={() => setActiveTab('markets')}
                  className={`px-6 py-2 rounded-full font-medium transition ${
                    activeTab === 'markets' 
                      ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white' 
                      : 'text-gray-600 hover:text-orange-600'
                  }`}
                >
                  🛒 Marketler
                </button>
              </div>
              
              <button 
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="bg-white rounded-full p-2 shadow-md hover:shadow-lg transition"
              >
                {viewMode === 'grid' ? <List className="w-5 h-5 text-gray-600" /> : <Grid className="w-5 h-5 text-gray-600" />}
              </button>
              
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className="bg-white rounded-full px-4 py-2 shadow-md hover:shadow-lg transition flex items-center space-x-2"
              >
                <Filter className="w-4 h-4 text-gray-600" />
                <span className="text-gray-600">Filtrele</span>
              </button>
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="bg-white rounded-xl p-6 shadow-md mb-8">
              <h3 className="font-semibold text-gray-900 mb-3">Filtreler</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Puan</label>
                  <select 
                    value={filters.rating}
                    onChange={(e) => setFilters({...filters, rating: parseFloat(e.target.value)})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value={0}>Tümü</option>
                    <option value={4}>4.0+</option>
                    <option value={4.5}>4.5+</option>
                    <option value={4.8}>4.8+</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Teslimat Süresi</label>
                  <select 
                    value={filters.deliveryTime}
                    onChange={(e) => setFilters({...filters, deliveryTime: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="all">Tümü</option>
                    <option value="15">15 dk</option>
                    <option value="20">20 dk</option>
                    <option value="25">25 dk</option>
                    <option value="30">30 dk</option>
                    <option value="fast">Hızlı (20dk-)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Sipariş</label>
                  <select 
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="all">Tümü</option>
                    <option value="30">30 TL</option>
                    <option value="50">50 TL</option>
                    <option value="80">80 TL</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Vendor List */}
          <div className={viewMode === 'grid' ? 'grid md:grid-cols-2 lg:grid-cols-4 gap-6' : 'space-y-6'}>
            {filteredVendors.map((vendor) => (
              <div key={vendor.id} className={`bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer ${
                viewMode === 'list' ? 'flex' : ''
              }`}>
                {viewMode === 'grid' ? (
                  <>
                    <div className="relative h-40 bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                      <div className="text-6xl">{vendor.image}</div>
                      {vendor.badge && (
                        <div className="absolute top-3 left-3 bg-white px-3 py-1 rounded-full text-xs font-semibold text-orange-600">
                          {vendor.badge}
                        </div>
                      )}
                      <div className="absolute top-3 right-3 bg-white px-2 py-1 rounded-full flex items-center space-x-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="text-sm font-semibold">{vendor.rating}</span>
                      </div>
                      <button 
                        onClick={() => toggleFavorite(vendor.id)}
                        className={`absolute top-3 right-12 p-1 ${vendor.isFavorite ? 'text-red-500' : 'text-white'}`}
                      >
                        <Heart className={`w-5 h-5 ${vendor.isFavorite ? 'fill-red-500' : ''}`} />
                      </button>
                    </div>
                    
                    <div className="p-4 space-y-3">
                      <div>
                        <h3 className="font-bold text-lg text-gray-900">{vendor.name}</h3>
                        <p className="text-sm text-gray-600">{vendor.category}</p>
                        <p className="text-xs text-gray-500 mt-1">{vendor.address}</p>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-1 text-gray-600">
                          <Clock className="w-4 h-4" />
                          <span>{vendor.deliveryTime} dk</span>
                        </div>
                        <div className="text-gray-600">Min: ₺{vendor.minOrder}</div>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <div>₺{vendor.deliveryFee} teslimat</div>
                        <div>{vendor.totalOrders.toLocaleString()} sipariş</div>
                      </div>
                      
                      <button 
                        onClick={() => startOrder(vendor.id)}
                        className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-2 rounded-xl font-medium hover:shadow-lg transition"
                      >
                        Sipariş Ver
                      </button>
                    </div>
                  </>
                ) : (
                  // List view
                  <div className="flex items-center p-4 space-x-4">
                    <div className="w-24 h-24 bg-gradient-to-br from-orange-400 to-red-500 rounded-xl flex items-center justify-center text-4xl">
                      {vendor.image}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h3 className="font-bold text-lg text-gray-900">{vendor.name}</h3>
                        <div className="flex items-center space-x-1 ml-2">
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          <span className="text-sm font-semibold">{vendor.rating}</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{vendor.category} • {vendor.address}</p>
                      <p className="text-xs text-gray-500 mt-1">{vendor.description}</p>
                      
                      <div className="flex items-center justify-between text-sm mt-2">
                        <div className="flex items-center space-x-1 text-gray-600">
                          <Clock className="w-4 h-4" />
                          <span>{vendor.deliveryTime} dk</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="text-gray-600">Min: ₺{vendor.minOrder}</div>
                          <div>₺{vendor.deliveryFee}</div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col space-y-2">
                      <button 
                        onClick={() => startOrder(vendor.id)}
                        className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg transition"
                      >
                        Sipariş
                      </button>
                      <button 
                        onClick={() => toggleFavorite(vendor.id)}
                        className={`p-2 rounded-lg ${vendor.isFavorite ? 'text-red-500 bg-red-50' : 'text-gray-400 bg-gray-100'}`}
                      >
                        <Heart className={`w-5 h-5 ${vendor.isFavorite ? 'fill-red-500' : ''}`} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Map Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Canlı <span className="text-orange-600">Kurye Takibi</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">Siparişinizi ve kuryenizi anlık olarak haritada takip edin</p>
          </div>
          
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl p-8 shadow-xl">
            <div className="bg-white rounded-2xl p-4 h-96 relative overflow-hidden">
              {/* Map placeholder with animated elements */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-indigo-200">
                {/* Grid pattern for map */}
                <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23d1d5db%22 fill-opacity=%220.2%22%3E%3Cpath d=%22M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]"></div>
                
                {/* Restaurant marker */}
                <div className="absolute top-1/4 left-1/4 w-10 h-10 bg-red-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                  <RestaurantMarker />
                </div>
                
                {/* Customer marker */}
                <div className="absolute bottom-1/4 right-1/4 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                  <HomeIcon />
                </div>
                
                {/* Moving courier marker */}
                {activeCourier && (
                  <div 
                    className="absolute w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center shadow-lg animate-bounce transform -translate-x-1/2 -translate-y-1/2"
                    style={{ 
                      top: `${40 + (Math.random() * 20)}%`, 
                      left: `${40 + (Math.random() * 20)}%` 
                    }}
                  >
                    <Bike className="w-6 h-6 text-white" />
                  </div>
                )}
                
                {/* Route line (simulated) */}
                <svg className="absolute inset-0 w-full h-full">
                  <path 
                    d="M150,150 Q300,100 450,300" 
                    stroke="#f97316" 
                    strokeWidth="4" 
                    fill="none" 
                    strokeDasharray="10,10"
                    className="animate-pulse"
                  />
                </svg>
              </div>
              
              {/* Map controls */}
              <div className="absolute top-4 right-4 flex flex-col space-y-2">
                <button className="w-10 h-10 bg-white rounded-lg shadow-md flex items-center justify-center">
                  <PlusIcon />
                </button>
                <button className="w-10 h-10 bg-white rounded-lg shadow-md flex items-center justify-center">
                  <MinusIcon />
                </button>
              </div>
              
              {/* Map info panel */}
              <div className="absolute bottom-4 left-4 bg-white rounded-xl p-4 shadow-lg max-w-xs">
                <h3 className="font-bold text-gray-900">Kurye Bilgileri</h3>
                <p className="text-sm text-gray-600 mt-1">Ahmet Yılmaz • 4.8 puan</p>
                <div className="flex items-center mt-2">
                  <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white mr-2">
                    👨‍✈️
                  </div>
                  <div className="text-sm">
                    <div className="font-medium">2.3 km uzakta</div>
                    <div className="text-gray-600">12 dakika içinde teslim</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* For Business */}
      <section className="py-20 bg-gradient-to-br from-orange-50 to-red-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-4xl font-bold text-gray-900">
                İşletmenizi <span className="text-orange-600">Büyütün</span>
              </h2>
              <p className="text-xl text-gray-600">
                KapGel ile işletmenize özel kurye sistemi ve canlı sipariş takibi. Müşterilerinize en hızlı şekilde ulaşın.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-start space-x-3 p-4 bg-white rounded-xl shadow-sm">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <ShoppingBag className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Kendi Kuryeniz</h4>
                    <p className="text-gray-600">Kendi kurye filonuzu yönetin veya platformumuzdan faydalanın</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3 p-4 bg-white rounded-xl shadow-sm">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Clock className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Gerçek Zamanlı Takip</h4>
                    <p className="text-gray-600">Siparişlerinizi ve kuryelerinizi anında takip edin</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3 p-4 bg-white rounded-xl shadow-sm">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Detaylı Raporlar</h4>
                    <p className="text-gray-600">Satış ve performans analizleriyle işinizi optimize edin</p>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-4">
                <button className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-8 py-4 rounded-xl font-medium hover:shadow-lg transition transform hover:scale-105 flex items-center space-x-2">
                  <span>İşletme Olarak Katıl</span>
                  <ChevronRight className="w-5 h-5" />
                </button>
                <button className="bg-white text-orange-600 border border-orange-500 px-8 py-4 rounded-xl font-medium hover:shadow-lg transition flex items-center space-x-2">
                  <span>Demo Talep Et</span>
                  <Play className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="relative">
              <div className="bg-gradient-to-br from-orange-100 to-red-100 rounded-3xl p-8">
                <Image
                  src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 400'%3E%3Crect fill='%23f97316' width='600' height='400' rx='20'/%3E%3Crect fill='white' x='50' y='50' width='500' height='300' rx='10'/%3E%3Ccircle fill='%23f59e0b' cx='150' cy='150' r='40'/%3E%3Crect fill='%2310b981' x='250' y='130' width='200' height='40' rx='5'/%3E%3Crect fill='%23ef4444' x='250' y='200' width='200' height='40' rx='5'/%3E%3C/svg%3E"
                  alt="Business Dashboard"
                  width={600}
                  height={400}
                  className="w-full rounded-2xl shadow-2xl"
                  priority
                />
              </div>
              
              <div className="absolute -top-6 -right-6 bg-white rounded-2xl shadow-xl p-4">
                <div className="text-2xl">📈</div>
                <div className="font-semibold">+45%</div>
                <div className="text-xs text-gray-600">Sipariş Artışı</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Kullanıcılarımızın <span className="text-orange-600">Yorumları</span>
            </h2>
            <p className="text-xl text-gray-600">Binlerce mutlu müşteriyle birlikteyiz</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[1, 2, 3].map((idx) => (
              <div key={idx} className="bg-gradient-to-br from-gray-50 to-orange-50 rounded-2xl p-6 shadow-md">
                <div className="flex items-center mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-5 h-5 ${i < 4 ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                  ))}
                </div>
                <p className="text-gray-700 mb-4">&quot;KapGel sayesinde favori restoranımdan en sevdiğim yemekleri çok kısa sürede kapımıda alabiliyorum. Canlı takip özelliği çok etkileyici!&quot;</p>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold mr-3">A</div>
                  <div>
                    <div className="font-semibold">Ayşe Yılmaz</div>
                    <div className="text-sm text-gray-600">İstanbul</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-5 gap-8 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <div className="bg-gradient-to-r from-orange-500 to-red-500 p-2 rounded-xl">
                  <Package className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">KapGel</h3>
                  <p className="text-sm text-gray-400">Gönder Gelsin</p>
                </div>
              </div>
              <p className="text-gray-400 text-sm mb-6">
                Yerel işletmeleri destekleyen, hızlı ve güvenilir teslimat platformu. Mahallenizdeki en iyi lezzetleri size getiriyoruz.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-orange-500 transition">
                  <span className="text-sm">f</span>
                </a>
                <a href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-orange-500 transition">
                  <span className="text-sm">t</span>
                </a>
                <a href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-orange-500 transition">
                  <span className="text-sm">in</span>
                </a>
                <a href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-orange-500 transition">
                  <span className="text-sm">ig</span>
                </a>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Müşteriler</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#" className="hover:text-white transition">Nasıl Çalışır</a></li>
                <li><a href="#" className="hover:text-white transition">Sipariş Takibi</a></li>
                <li><a href="#" className="hover:text-white transition">Favoriler</a></li>
                <li><a href="#" className="hover:text-white transition">İndirimler</a></li>
                <li><a href="#" className="hover:text-white transition">Yardım</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">İşletmeler</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#" className="hover:text-white transition">İşletme Paneli</a></li>
                <li><a href="#" className="hover:text-white transition">Kurye Yönetimi</a></li>
                <li><a href="#" className="hover:text-white transition">Raporlar</a></li>
                <li><a href="#" className="hover:text-white transition">Pazarlama</a></li>
                <li><a href="#" className="hover:text-white transition">Destek</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Kurye</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#" className="hover:text-white transition">Kurye Ol</a></li>
                <li><a href="#" className="hover:text-white transition">Kurye Paneli</a></li>
                <li><a href="#" className="hover:text-white transition">Kazanç</a></li>
                <li><a href="#" className="hover:text-white transition">Eğitim</a></li>
                <li><a href="#" className="hover:text-white transition">SSS</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">© 2025 KapGel. Tüm hakları saklıdır.</p>
            <div className="flex flex-wrap justify-center space-x-6 mt-4 md:mt-0">
              <a href="#" className="text-gray-400 hover:text-white text-sm transition">Gizlilik</a>
              <a href="#" className="text-gray-400 hover:text-white text-sm transition">Koşullar</a>
              <a href="#" className="text-gray-400 hover:text-white text-sm transition">İletişim</a>
              <a href="#" className="text-gray-400 hover:text-white text-sm transition">Kariyer</a>
              <a href="#" className="text-gray-400 hover:text-white text-sm transition">Çerezler</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

// Helper components for map markers
const RestaurantMarker = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6 text-white">
    <path fill="currentColor" d="M18,17H6V7H18M18,5H6A2,2 0 0,0 4,7V17A2,2 0 0,0 6,19H18A2,2 0 0,0 20,17V7A2,2 0 0,0 18,5M15,14V10H16.17L17,9H15V6H13V9H11V6H9V10H10.17L11,11H9V14H11V12H13V14H15M13,11V9H11V11H13Z" />
  </svg>
);

const HomeIcon = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6 text-white">
    <path fill="currentColor" d="M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z" />
  </svg>
);

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 text-gray-600">
    <path fill="currentColor" d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
  </svg>
);

const MinusIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 text-gray-600">
    <path fill="currentColor" d="M19,13H5V11H19V13Z" />
  </svg>
);

export default KapgelAdvancedLanding;
