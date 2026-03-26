export interface User {
  lennoxpass_number: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  nationality: string;
  photo_url: string;
  address: {
    hub: string;
    level: number;
    apartment: string;
    full: string;
  };
  housing: {
    apartment_type: string;
    size_sqm: number;
    move_in_date: string;
    rent_monthly: number;
    rent_due_date: string;
    payment_method: string;
    income_annual: number;
    rent_percentage: number;
    application_status: 'NONE' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';
  };
  banking: {
    gbp_account_status: 'NONE' | 'UNDER_REVIEW' | 'ACTIVE';
    gbp_balance: number;
  };
  health: {
    gp_practice: string;
    gp_name: string;
    nhs_number: string;
    blood_type: string;
    allergies: string[];
    conditions: string[];
  };
  transport: {
    metro_journeys_month: number;
    most_used_line: string;
    vehicles: {
      registration: string;
      type: string;
      congestion_charge_status: string;
      road_tax_expiry: string;
    }[];
  };
}

export interface HubService {
  id: string;
  name: string;
  category: 'food' | 'shopping' | 'services' | 'cafes' | 'entertainment' | 'fitness' | 'convenience' | 'culture' | 'fashion' | 'beauty' | 'electronics' | 'homeware' | 'books' | 'children' | 'specialty';
  level: number;
  description: string;
  hours: string;
  isOpen: boolean;
  rating: number;
  reviews: number;
  priceRange: string;
  image: string;
  phone: string;
  website?: string;
  specialInfo?: string;
  tags: string[];
  isExclusive?: boolean;
  brandOrigin?: string;
}

export interface Hub {
  id: string;
  name: string;
  address: string;
  retailerCount: number;
  travelTime: string;
  isResidence?: boolean;
  services: HubService[];
  highlights?: string[];
  exclusiveBrands?: string[];
  stats: {
    food: number;
    fashion: number;
    services: number;
  };
}

export const mockHubs: Hub[] = [
  {
    id: 'dumbarton-riverfront',
    name: 'Dumbarton Riverfront Hub',
    address: 'Dumbarton Central, Lennox',
    retailerCount: 111,
    travelTime: 'You live here',
    isResidence: true,
    stats: { food: 32, fashion: 28, services: 18 },
    services: [
      // LEVEL 1
      {
        id: 'tesco-metro',
        name: 'Tesco Metro',
        category: 'convenience',
        level: 1,
        description: 'Full grocery range and household essentials.',
        hours: 'Open 24/7',
        isOpen: true,
        rating: 4.3,
        reviews: 2100,
        priceRange: 'L$L$',
        image: 'https://picsum.photos/seed/tesco/800/600',
        phone: '01389 889900',
        tags: ['Supermarket', 'Groceries', '24/7']
      },
      {
        id: 'waitrose',
        name: 'Waitrose',
        category: 'convenience',
        level: 1,
        description: 'Premium groceries and fresh produce.',
        hours: '7:00 AM - 10:00 PM',
        isOpen: true,
        rating: 4.7,
        reviews: 1200,
        priceRange: 'L$L$L$',
        image: 'https://picsum.photos/seed/waitrose/800/600',
        phone: '01389 889911',
        tags: ['Supermarket', 'Premium', 'Groceries']
      },
      {
        id: 'h-m',
        name: 'H&M',
        category: 'fashion',
        level: 1,
        description: 'High-street fashion for men, women, and children.',
        hours: '9:00 AM - 8:00 PM',
        isOpen: true,
        rating: 4.2,
        reviews: 3400,
        priceRange: 'L$L$',
        image: 'https://picsum.photos/seed/hm/800/600',
        phone: '01389 889922',
        tags: ['Fashion', 'Clothing', 'Value']
      },
      {
        id: 'zara',
        name: 'Zara',
        category: 'fashion',
        level: 1,
        description: 'Latest trends in fashion and accessories.',
        hours: '9:00 AM - 8:00 PM',
        isOpen: true,
        rating: 4.5,
        reviews: 2800,
        priceRange: 'L$L$L$',
        image: 'https://picsum.photos/seed/zara/800/600',
        phone: '01389 889933',
        tags: ['Fashion', 'Trends', 'Spanish']
      },
      {
        id: 'co-op-food',
        name: 'Co-op Food',
        category: 'convenience',
        level: 1,
        description: 'Quality food and ethical sourcing.',
        hours: '6:00 AM - 11:00 PM',
        isOpen: true,
        rating: 4.1,
        reviews: 800,
        priceRange: 'L$L$',
        image: 'https://picsum.photos/seed/coop/800/600',
        phone: '01389 889988',
        tags: ['Supermarket', 'Groceries', 'Ethical']
      },
      {
        id: 'primark',
        name: 'Primark',
        category: 'fashion',
        level: 1,
        description: 'Amazing fashion at amazing prices.',
        hours: '8:00 AM - 9:00 PM',
        isOpen: true,
        rating: 4.0,
        reviews: 5200,
        priceRange: 'L$',
        image: 'https://picsum.photos/seed/primark/800/600',
        phone: '01389 889999',
        tags: ['Fashion', 'Value', 'Clothing']
      },
      {
        id: '7-eleven-dumbarton',
        name: '7-Eleven',
        category: 'convenience',
        level: 1,
        description: '24/7 convenience for snacks and essentials.',
        hours: 'Open 24/7',
        isOpen: true,
        rating: 4.1,
        reviews: 560,
        priceRange: 'L$',
        image: 'https://picsum.photos/seed/7eleven/800/600',
        phone: '01389 778899',
        tags: ['Convenience', 'Snacks', '24/7']
      },
      {
        id: 'boots-pharmacy',
        name: 'Boots',
        category: 'beauty',
        level: 2,
        description: 'Pharmacy, health, and beauty products.',
        hours: '8:00 AM - 9:00 PM',
        isOpen: true,
        rating: 4.4,
        reviews: 1800,
        priceRange: 'L$L$',
        image: 'https://picsum.photos/seed/boots/800/600',
        phone: '01389 778800',
        tags: ['Pharmacy', 'Beauty', 'Health']
      },
      {
        id: 'apple-store',
        name: 'Apple Store',
        category: 'electronics',
        level: 2,
        description: 'Official Apple retail store for iPhone, Mac, and support.',
        hours: '9:00 AM - 8:00 PM',
        isOpen: true,
        rating: 4.9,
        reviews: 3200,
        priceRange: 'L$L$L$L$',
        image: 'https://picsum.photos/seed/apple/800/600',
        phone: '01389 889955',
        tags: ['Tech', 'Apple', 'Support']
      },
      {
        id: 'waterstones',
        name: 'Waterstones',
        category: 'books',
        level: 2,
        description: 'Leading bookshop with a wide range of titles and a café.',
        hours: '9:00 AM - 8:00 PM',
        isOpen: true,
        rating: 4.7,
        reviews: 1500,
        priceRange: 'L$L$',
        image: 'https://picsum.photos/seed/books/800/600',
        phone: '01389 889966',
        tags: ['Books', 'Reading', 'Café']
      },
      // LEVEL 3
      {
        id: 'indigo',
        name: 'Indigo',
        category: 'food',
        level: 3,
        description: 'French Fine Dining with Scottish ingredients. Michelin-starred experience overlooking Loch Lomond.',
        hours: '6:00 PM - 10:00 PM',
        isOpen: true,
        rating: 4.9,
        reviews: 847,
        priceRange: 'L$L$L$L$',
        image: 'https://picsum.photos/seed/indigo/800/600',
        phone: '01389 463446',
        website: 'indigo-lennox.lx',
        specialInfo: '3-month waiting list. Michelin 1-star.',
        tags: ['Fine Dining', 'French', 'Romantic']
      },
      {
        id: 'nandos',
        name: "Nando's",
        category: 'food',
        level: 3,
        description: 'Famous Peri-peri chicken and casual dining.',
        hours: '11:00 AM - 11:00 PM',
        isOpen: true,
        rating: 4.4,
        reviews: 1247,
        priceRange: 'L$L$',
        image: 'https://picsum.photos/seed/nandos/800/600',
        phone: '01389 112233',
        tags: ['Chicken', 'Casual', 'Family']
      },
      {
        id: 'wagamama',
        name: 'Wagamama',
        category: 'food',
        level: 3,
        description: 'Asian-inspired noodles and fresh flavors.',
        hours: '11:00 AM - 10:00 PM',
        isOpen: true,
        rating: 4.6,
        reviews: 982,
        priceRange: 'L$L$',
        image: 'https://picsum.photos/seed/wagamama/800/600',
        phone: '01389 445566',
        tags: ['Asian', 'Noodles', 'Healthy']
      },
      {
        id: 'vue-cinema',
        name: 'Vue Cinema',
        category: 'entertainment',
        level: 3,
        description: 'State-of-the-art 6-screen cinema showing latest releases.',
        hours: '10:00 AM - 12:00 AM',
        isOpen: true,
        rating: 4.5,
        reviews: 2500,
        priceRange: 'L$L$',
        image: 'https://picsum.photos/seed/cinema/800/600',
        phone: '01389 889977',
        tags: ['Movies', 'Entertainment', 'Cinema']
      }
    ]
  },
  {
    id: 'balloch',
    name: 'Balloch Hub',
    address: 'Balloch Central, Lennox',
    retailerCount: 156,
    travelTime: '12 min Metro',
    stats: { food: 48, fashion: 42, services: 22 },
    highlights: ['Largest Hub', 'American Retail Corridor'],
    exclusiveBrands: ['Target', 'Chick-fil-A', 'Wendy\'s', 'Dave & Buster\'s', 'IHOP', 'Cheesecake Factory'],
    services: [
      // AMERICAN EXCLUSIVES
      {
        id: 'target',
        name: 'Target',
        category: 'shopping',
        level: 2,
        description: 'American Department Store. ONLY in Lennox. Clothing, homeware, groceries, and pharmacy.',
        hours: '8:00 AM - 10:00 PM',
        isOpen: true,
        rating: 4.7,
        reviews: 5600,
        priceRange: 'L$L$',
        image: 'https://picsum.photos/seed/target/800/600',
        phone: '01389 990011',
        isExclusive: true,
        brandOrigin: 'USA',
        tags: ['Department Store', 'American', 'Exclusive'],
        specialInfo: 'American brands unavailable elsewhere in UK/Europe'
      },
      {
        id: 'chick-fil-a',
        name: 'Chick-fil-A',
        category: 'food',
        level: 1,
        description: 'American Chicken. ONLY in UK/Europe. Famous chicken sandwiches and waffle fries.',
        hours: '10:00 AM - 9:00 PM (Closed Sun)',
        isOpen: true,
        rating: 4.9,
        reviews: 4200,
        priceRange: 'L$L$',
        image: 'https://picsum.photos/seed/chickfila/800/600',
        phone: '01389 990022',
        isExclusive: true,
        brandOrigin: 'USA',
        tags: ['Chicken', 'American', 'Fast Food'],
        specialInfo: 'Long queues typical (very popular)'
      },
      {
        id: 'dave-busters',
        name: "Dave & Buster's",
        category: 'entertainment',
        level: 3,
        description: 'American Arcade + Restaurant. ONLY in UK/Europe. Eat, drink, play games, win prizes.',
        hours: '11:00 AM - 12:00 AM',
        isOpen: true,
        rating: 4.6,
        reviews: 3100,
        priceRange: 'L$L$L$',
        image: 'https://picsum.photos/seed/davebusters/800/600',
        phone: '01389 990033',
        isExclusive: true,
        brandOrigin: 'USA',
        tags: ['Arcade', 'Entertainment', 'American']
      },
      {
        id: 'wendys',
        name: "Wendy's",
        category: 'food',
        level: 1,
        description: 'American Burgers. Fresh, never frozen beef. Famous Frosty desserts.',
        hours: '10:00 AM - 11:00 PM',
        isOpen: true,
        rating: 4.3,
        reviews: 1800,
        priceRange: 'L$L$',
        image: 'https://picsum.photos/seed/wendys/800/600',
        phone: '01389 990044',
        isExclusive: true,
        brandOrigin: 'USA',
        tags: ['Burgers', 'American', 'Fast Food']
      },
      {
        id: 'ihop',
        name: 'IHOP',
        category: 'food',
        level: 3,
        description: 'International House of Pancakes. Famous American breakfast and pancakes.',
        hours: '7:00 AM - 10:00 PM',
        isOpen: true,
        rating: 4.5,
        reviews: 1500,
        priceRange: 'L$L$',
        image: 'https://picsum.photos/seed/ihop/800/600',
        phone: '01389 990066',
        isExclusive: true,
        brandOrigin: 'USA',
        tags: ['Breakfast', 'Pancakes', 'American']
      },
      {
        id: 'cheesecake-factory',
        name: 'The Cheesecake Factory',
        category: 'food',
        level: 3,
        description: 'American Dining. Massive menu and over 30 varieties of cheesecake.',
        hours: '11:00 AM - 11:00 PM',
        isOpen: true,
        rating: 4.7,
        reviews: 2900,
        priceRange: 'L$L$L$',
        image: 'https://picsum.photos/seed/cheesecake/800/600',
        phone: '01389 990055',
        isExclusive: true,
        brandOrigin: 'USA',
        tags: ['Dining', 'Cheesecake', 'American']
      }
    ]
  },
  {
    id: 'clydebank',
    name: 'Clydebank Hub',
    address: 'Clydebank Central, Lennox',
    retailerCount: 124,
    travelTime: '8 min Metro',
    stats: { food: 35, fashion: 31, services: 20 },
    services: []
  },
  {
    id: 'helensburgh',
    name: 'Helensburgh Hub',
    address: 'Helensburgh Waterfront, Lennox',
    retailerCount: 98,
    travelTime: '25 min Metro',
    stats: { food: 22, fashion: 35, services: 15 },
    highlights: ['Luxury Brands'],
    exclusiveBrands: ['Burberry', 'Gucci', 'Mulberry', 'Waitrose'],
    services: [
      {
        id: 'burberry',
        name: 'Burberry',
        category: 'fashion',
        level: 2,
        description: 'British Luxury Fashion. Trench coats, scarves, and ready-to-wear.',
        hours: '10:00 AM - 6:00 PM',
        isOpen: true,
        rating: 4.8,
        reviews: 850,
        priceRange: 'L$L$L$L$',
        image: 'https://picsum.photos/seed/burberry/800/600',
        phone: '01389 770011',
        tags: ['Luxury', 'Fashion', 'British'],
        specialInfo: 'VAT refund available for tourists'
      }
    ]
  },
  {
    id: 'alexandria',
    name: 'Alexandria Hub',
    address: 'Alexandria North, Lennox',
    retailerCount: 118,
    travelTime: '15 min Metro',
    stats: { food: 29, fashion: 27, services: 18 },
    highlights: ['IKEA Full Store'],
    services: [
      {
        id: 'ikea-full',
        name: 'IKEA Full Store',
        category: 'homeware',
        level: 1,
        description: '15,000m² full-size IKEA. Complete furniture range and Swedish restaurant.',
        hours: '10:00 AM - 9:00 PM',
        isOpen: true,
        rating: 4.6,
        reviews: 5200,
        priceRange: 'L$L$',
        image: 'https://picsum.photos/seed/ikea/800/600',
        phone: '01389 660011',
        tags: ['Furniture', 'Swedish', 'Home']
      }
    ]
  },
  {
    id: 'renton',
    name: 'Renton Hub',
    address: 'Renton Valley, Lennox',
    retailerCount: 72,
    travelTime: '20 min Metro',
    stats: { food: 18, fashion: 15, services: 12 },
    services: []
  },
  {
    id: 'bowling',
    name: 'Bowling Hub',
    address: 'Bowling Canal, Lennox',
    retailerCount: 89,
    travelTime: '30 min Metro',
    stats: { food: 24, fashion: 19, services: 14 },
    services: []
  }
];

export const mockUser: User = {
  lennoxpass_number: "1234-5678-9012",
  first_name: "Angus",
  last_name: "McDonald",
  email: "angus.mcdonald@email.lx",
  phone: "+44 7700 900123",
  date_of_birth: "1994-03-15",
  nationality: "Lennoxian Citizen",
  photo_url: "https://picsum.photos/seed/angus/200/200",
  address: {
    hub: "Dumbarton Riverfront Hub",
    level: 7,
    apartment: "0847",
    full: "Dumbarton Riverfront Hub, Level 7, Apartment 0847, Dumbarton, Lennox"
  },
  housing: {
    apartment_type: "1-bedroom",
    size_sqm: 52,
    move_in_date: "2023-07-01",
    rent_monthly: 280,
    rent_due_date: "2025-04-01",
    payment_method: "Direct debit",
    income_annual: 42000,
    rent_percentage: 8,
    application_status: 'NONE'
  },
  banking: {
    gbp_account_status: 'NONE',
    gbp_balance: 0
  },
  health: {
    gp_practice: "Dumbarton Hub GP Clinic",
    gp_name: "Dr. Sarah Chen",
    nhs_number: "XXX-XXX-XXXX",
    blood_type: "O+",
    allergies: ["Penicillin"],
    conditions: []
  },
  transport: {
    metro_journeys_month: 48,
    most_used_line: "Red Line",
    vehicles: [
      {
        registration: "SJ18 ABC",
        type: "UK-registered",
        congestion_charge_status: "Paid today",
        road_tax_expiry: "2025-12-31"
      }
    ]
  }
};
