# TYT CRM Frontend

A modern, full-featured Customer Relationship Management (CRM) system built with Next.js 15, TypeScript, and Tailwind CSS.

## 🚀 Features

- **Modern Tech Stack**: Next.js 15 with App Router, TypeScript, and Tailwind CSS
- **Responsive Design**: Mobile-first design with beautiful UI components
- **Authentication**: Secure authentication with NextAuth.js
- **Real-time Updates**: WebSocket integration for live updates
- **Dashboard Analytics**: Comprehensive analytics and reporting
- **Customer Management**: Complete customer lifecycle management
- **Sales Pipeline**: Visual sales pipeline with deal tracking
- **Task Management**: Task and activity management system
- **File Uploads**: Secure file upload and management
- **Notifications**: Real-time notifications system

## 🛠️ Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Custom component library with Radix UI
- **State Management**: Zustand
- **Data Fetching**: SWR
- **Forms**: Formik with Yup validation
- **Authentication**: NextAuth.js
- **Real-time**: Socket.io
- **Animations**: Framer Motion
- **Icons**: Lucide React & Iconify
- **Date Handling**: date-fns

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Git

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd TYT-CRM-Frontend-V1
```

### 2. Install dependencies

```bash
npm install
# or
yarn install
```

### 3. Environment Setup

Copy the environment example file and configure your variables:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:

```env
# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME="TYT CRM"

# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/tyt_crm"

# Authentication Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-key-here

# Add other required environment variables...
```

### 4. Run the development server

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 📁 Project Structure

```
├── app/                    # Next.js App Router pages
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # Reusable components
│   └── ui/               # UI component library
├── lib/                  # Utility functions
├── types/                # TypeScript type definitions
├── middleware.ts         # Next.js middleware
├── tailwind.config.ts    # Tailwind CSS configuration
├── next.config.ts        # Next.js configuration
├── tsconfig.json         # TypeScript configuration
└── package.json          # Dependencies and scripts
```

## 🎨 UI Components

The project includes a comprehensive UI component library built with:

- **Radix UI**: Accessible primitives
- **Tailwind CSS**: Utility-first styling
- **Class Variance Authority**: Component variants
- **Tailwind Merge**: Conditional classes

### Available Components

- Button
- Card
- Input
- Modal
- Dropdown
- Toast
- And more...

## 🔧 Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production with Turbopack
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Configure environment variables in Vercel dashboard
4. Deploy automatically on every push

### Docker

```bash
# Build the Docker image
docker build -t tyt-crm-frontend .

# Run the container
docker run -p 3000:3000 tyt-crm-frontend
```

### Manual Deployment

```bash
# Build the application
npm run build

# Start the production server
npm start
```

## 🔐 Authentication

The application uses NextAuth.js for authentication with support for:

- Email/Password
- Google OAuth
- GitHub OAuth
- Custom providers

## 📊 State Management

State management is handled by Zustand for:

- User authentication state
- UI state (modals, notifications)
- Form state
- Cache management

## 🌐 API Integration

The frontend integrates with a REST API for:

- Customer management
- Deal tracking
- User management
- File uploads
- Analytics data

## 🎯 Performance Optimizations

- **Turbopack**: Fast bundler for development
- **Image Optimization**: Next.js Image component
- **Code Splitting**: Automatic code splitting
- **Lazy Loading**: Component and route lazy loading
- **Caching**: SWR for data caching
- **Bundle Analysis**: Optimized bundle sizes

## 🧪 Testing

```bash
# Run tests (when implemented)
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 📝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, email support@tytcrm.com or create an issue in the repository.

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- Vercel for hosting and deployment
- Tailwind CSS for the utility-first CSS framework
- All the open-source contributors
