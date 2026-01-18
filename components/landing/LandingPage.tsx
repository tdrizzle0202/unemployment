'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils/cn';

// ============================================================================
// ANIMATION VARIANTS
// ============================================================================

const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0 }
};

const fadeIn = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
};

const scaleIn = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1 }
};

const staggerContainer = {
    hidden: { opacity: 1 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1,
            delayChildren: 0.1
        }
    }
};

const heroStagger = {
    hidden: { opacity: 1 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.15,
            delayChildren: 0.2
        }
    }
};

// ============================================================================
// ICONS
// ============================================================================

function ShieldCheckIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
    );
}

function SparklesIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
        </svg>
    );
}

function MapIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
        </svg>
    );
}

function BoltIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
        </svg>
    );
}

function LockClosedIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
    );
}

function ChatBubbleIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
        </svg>
    );
}

function ClipboardDocumentCheckIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0118 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.375m-8.25-3l1.5 1.5 3-3.75" />
        </svg>
    );
}

function DocumentCheckIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.125 2.25h-4.5c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125v-12M10.125 2.25h.375a9 9 0 019 9v.375M10.125 2.25A3.375 3.375 0 0113.5 5.625v1.5c0 .621.504 1.125 1.125 1.125h1.5a3.375 3.375 0 013.375 3.375M9 15l2.25 2.25L15 12" />
        </svg>
    );
}

function CheckIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
    );
}

function ArrowRightIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
        </svg>
    );
}

// ============================================================================
// FEATURE CARD
// ============================================================================

interface FeatureCardProps {
    icon: React.ReactNode;
    title: string;
    description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
    return (
        <motion.div
            variants={fadeInUp}
            whileHover={{ y: -8, transition: { duration: 0.2 } }}
            className={cn(
                'group relative bg-white rounded-2xl p-6 shadow-sm border border-gray-100',
                'hover:shadow-lg hover:border-[#A897C6]/30',
                'transition-shadow duration-300 ease-out'
            )}
        >
            <motion.div
                className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#A897C6]/20 to-[#A897C6]/5 flex items-center justify-center mb-4"
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: "spring", stiffness: 300 }}
            >
                <div className="text-[#A897C6]">{icon}</div>
            </motion.div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
            <p className="text-gray-600 text-sm leading-relaxed">{description}</p>
        </motion.div>
    );
}

// ============================================================================
// STEP CARD
// ============================================================================

interface StepCardProps {
    number: number;
    title: string;
    description: string;
    icon: React.ReactNode;
}

function StepCard({ number, title, description, icon }: StepCardProps) {
    return (
        <motion.div
            variants={fadeInUp}
            className="relative flex flex-col items-center text-center"
        >
            {/* Step number badge */}
            <motion.div
                className="w-10 h-10 rounded-full bg-[#A897C6] text-white font-bold flex items-center justify-center text-lg mb-4 shadow-lg shadow-[#A897C6]/30"
                whileHover={{ scale: 1.15 }}
                transition={{ type: "spring", stiffness: 400 }}
            >
                {number}
            </motion.div>

            {/* Icon */}
            <motion.div
                className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#F8F7FC] to-white border border-gray-100 flex items-center justify-center mb-4 shadow-sm"
                whileHover={{ scale: 1.05, rotate: 3 }}
                transition={{ type: "spring", stiffness: 300 }}
            >
                <div className="text-[#A897C6]">{icon}</div>
            </motion.div>

            <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
            <p className="text-gray-600 text-sm leading-relaxed max-w-xs">{description}</p>
        </motion.div>
    );
}

// ============================================================================
// MAIN LANDING PAGE
// ============================================================================

export function LandingPage() {
    return (
        <div className="min-h-screen bg-white">
            {/* Hero Section */}
            <section className="relative overflow-hidden" style={{ backgroundColor: 'rgb(227, 229, 232)' }}>
                {/* Logo */}
                <motion.div
                    className="absolute top-6 left-6 z-10"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <span className="text-4xl font-black text-black tracking-tight" style={{ fontWeight: 950 }}>bruno</span>
                </motion.div>

                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-8">
                    {/* Top trust bar */}
                    <motion.div
                        className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 mb-8"
                        variants={staggerContainer}
                        initial="hidden"
                        animate="visible"
                    >
                        <motion.div variants={fadeInUp} className="flex items-center gap-2 text-sm text-gray-600">
                            <CheckIcon className="w-4 h-4 text-emerald-500" />
                            <span>100% Free</span>
                        </motion.div>
                        <motion.div variants={fadeInUp} className="flex items-center gap-2 text-sm text-gray-600">
                            <LockClosedIcon className="w-4 h-4 text-blue-500" />
                            <span>Private & Secure</span>
                        </motion.div>
                        <motion.div variants={fadeInUp} className="flex items-center gap-2 text-sm text-gray-600">
                            <BoltIcon className="w-4 h-4 text-amber-500" />
                            <span>Results in Minutes</span>
                        </motion.div>
                    </motion.div>

                    <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
                        {/* Left side - Text content */}
                        <motion.div
                            className="flex-1 text-center lg:text-left"
                            variants={heroStagger}
                            initial="hidden"
                            animate="visible"
                        >
                            <motion.h1
                                variants={fadeInUp}
                                transition={{ duration: 0.6 }}
                                className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight mb-6"
                            >
                                Check Your{' '}
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#A897C6] to-[#8B7AAE]">
                                    Unemployment Benefits
                                </span>{' '}
                                in Minutes
                            </motion.h1>

                            <motion.p
                                variants={fadeInUp}
                                transition={{ duration: 0.6 }}
                                className="text-lg sm:text-xl text-gray-600 mb-8 max-w-xl"
                            >
                                Not sure if you qualify for unemployment insurance? Answer a few quick questions to estimate your eligibility and potential benefits.
                            </motion.p>

                            <motion.div
                                variants={fadeInUp}
                                transition={{ duration: 0.6 }}
                                className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start"
                            >
                                <motion.div
                                    whileHover={{ scale: 1.03, y: -2 }}
                                    whileTap={{ scale: 0.98 }}
                                    transition={{ type: "spring", stiffness: 400 }}
                                >
                                    <Link
                                        href="/assess"
                                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-[#A897C6] to-[#9787B6] rounded-xl shadow-lg shadow-[#A897C6]/30 hover:shadow-xl hover:shadow-[#A897C6]/40 transition-shadow duration-300"
                                    >
                                        Get Started Free
                                        <ArrowRightIcon className="w-5 h-5" />
                                    </Link>
                                </motion.div>
                                <motion.a
                                    href="#how-it-works"
                                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-semibold text-gray-700 bg-white border-2 border-gray-200 rounded-xl hover:border-[#A897C6] hover:text-[#A897C6] transition-all duration-300"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    See How It Works
                                </motion.a>
                            </motion.div>

                            <motion.p
                                variants={fadeIn}
                                transition={{ duration: 0.6, delay: 0.4 }}
                                className="mt-4 text-sm text-gray-500"
                            >
                                No account required • Takes about 5 minutes
                            </motion.p>
                        </motion.div>

                        {/* Bruno video */}
                        <motion.div
                            className="flex-shrink-0"
                            initial={{ opacity: 0, scale: 0.9, x: 50 }}
                            animate={{ opacity: 1, scale: 1, x: 0 }}
                            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
                        >
                            <motion.div
                                className="w-80 h-80 sm:w-96 sm:h-96 lg:w-[480px] lg:h-[480px]"
                                style={{
                                    maskImage: 'radial-gradient(ellipse 70% 70% at center, black 50%, transparent 100%)',
                                    WebkitMaskImage: 'radial-gradient(ellipse 70% 70% at center, black 50%, transparent 100%)'
                                }}
                                animate={{ y: [0, -10, 0] }}
                                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            >
                                <video
                                    autoPlay
                                    loop
                                    muted
                                    playsInline
                                    className="w-full h-full object-cover"
                                >
                                    <source src="/bruno/video.mp4" type="video/mp4" />
                                </video>
                            </motion.div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-20 bg-[#F8F7FC]">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div
                        className="text-center mb-12"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                        variants={fadeInUp}
                        transition={{ duration: 0.6 }}
                    >
                        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                            Why Use Bruno?
                        </h2>
                        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                            Navigating unemployment benefits can be confusing. Bruno makes it simple.
                        </p>
                    </motion.div>

                    <motion.div
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
                        variants={staggerContainer}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-50px" }}
                    >
                        <FeatureCard
                            icon={<SparklesIcon className="w-6 h-6" />}
                            title="AI-Powered"
                            description="Bruno uses smart AI to understand your situation and provide personalized guidance."
                        />
                        <FeatureCard
                            icon={<MapIcon className="w-6 h-6" />}
                            title="All 50 States"
                            description="Covers unemployment rules for every U.S. state with up-to-date eligibility requirements."
                        />
                        <FeatureCard
                            icon={<BoltIcon className="w-6 h-6" />}
                            title="Instant Results"
                            description="Get your eligibility assessment in minutes, not hours or days of research."
                        />
                        <FeatureCard
                            icon={<ShieldCheckIcon className="w-6 h-6" />}
                            title="Private & Secure"
                            description="Your information stays private. No data is stored or shared with anyone."
                        />
                    </motion.div>
                </div>
            </section>

            {/* How It Works Section */}
            <section id="how-it-works" className="py-20 bg-white scroll-mt-8">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div
                        className="text-center mb-16"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                        variants={fadeInUp}
                        transition={{ duration: 0.6 }}
                    >
                        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                            How It Works
                        </h2>
                        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                            Three simple steps to understand your unemployment benefits eligibility.
                        </p>
                    </motion.div>

                    <motion.div
                        className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8"
                        variants={staggerContainer}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-50px" }}
                    >
                        <StepCard
                            number={1}
                            icon={<ChatBubbleIcon className="w-8 h-8" />}
                            title="Chat with Bruno"
                            description="Tell Bruno about your work history and how your employment ended. It's like talking to a helpful friend."
                        />
                        <StepCard
                            number={2}
                            icon={<ClipboardDocumentCheckIcon className="w-8 h-8" />}
                            title="Answer Questions"
                            description="Bruno will ask a few simple questions about your wages, hours worked, and employment situation."
                        />
                        <StepCard
                            number={3}
                            icon={<DocumentCheckIcon className="w-8 h-8" />}
                            title="Get Your Results"
                            description="Receive an instant assessment of your eligibility and estimated weekly benefit amount."
                        />
                    </motion.div>
                </div>
            </section>

            {/* Benefits List Section */}
            <section className="py-20 bg-gradient-to-b from-[#F8F7FC] to-white">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div
                        className="text-center mb-12"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                        variants={fadeInUp}
                        transition={{ duration: 0.6 }}
                    >
                        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                            What You&apos;ll Learn
                        </h2>
                        <p className="text-lg text-gray-600">
                            Bruno&apos;s assessment gives you clarity on your unemployment benefits.
                        </p>
                    </motion.div>

                    <motion.div
                        className="bg-white rounded-3xl shadow-xl shadow-gray-100/50 border border-gray-100 p-8 sm:p-12"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-50px" }}
                        variants={scaleIn}
                        transition={{ duration: 0.5 }}
                    >
                        <motion.ul
                            className="space-y-5"
                            variants={staggerContainer}
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                        >
                            {[
                                'Whether you meet your state\'s monetary eligibility requirements',
                                'Your estimated weekly benefit amount (WBA)',
                                'How your reason for leaving affects your eligibility',
                                'State-specific rules and requirements that apply to you',
                                'What to expect when you file your official claim',
                            ].map((item, index) => (
                                <motion.li
                                    key={index}
                                    className="flex items-start gap-4"
                                    variants={fadeInUp}
                                    transition={{ duration: 0.4 }}
                                >
                                    <motion.div
                                        className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center mt-0.5"
                                        initial={{ scale: 0 }}
                                        whileInView={{ scale: 1 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: index * 0.1 + 0.2, type: "spring", stiffness: 300 }}
                                    >
                                        <CheckIcon className="w-4 h-4 text-emerald-600" />
                                    </motion.div>
                                    <span className="text-gray-700 text-lg">{item}</span>
                                </motion.li>
                            ))}
                        </motion.ul>
                    </motion.div>
                </div>
            </section>

            {/* Final CTA Section */}
            <section className="py-20 bg-white">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <motion.div
                        className="relative"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                        variants={staggerContainer}
                    >
                        {/* Bruno small avatar */}
                        <motion.div
                            className="mx-auto w-40 h-40 mb-8 relative"
                            variants={scaleIn}
                            transition={{ duration: 0.6 }}
                        >
                            <motion.div
                                className="absolute inset-0 bg-gradient-to-b from-[#A897C6]/20 to-transparent rounded-full blur-xl"
                                animate={{ scale: [1, 1.1, 1] }}
                                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                            />
                            <motion.div
                                animate={{ y: [0, -5, 0] }}
                                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                className="relative w-full h-full"
                            >
                                <Image
                                    src="/bruno/bruno-thinking-cropped.png"
                                    alt="Bruno"
                                    fill
                                    className="object-contain"
                                />
                            </motion.div>
                        </motion.div>

                        <motion.h2
                            className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4"
                            variants={fadeInUp}
                            transition={{ duration: 0.5 }}
                        >
                            Ready to Check Your Eligibility?
                        </motion.h2>
                        <motion.p
                            className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto"
                            variants={fadeInUp}
                            transition={{ duration: 0.5 }}
                        >
                            It only takes a few minutes. Bruno is here to help you understand your unemployment benefits.
                        </motion.p>

                        <motion.div
                            variants={fadeInUp}
                            transition={{ duration: 0.5 }}
                        >
                            <motion.div
                                whileHover={{ scale: 1.03, y: -3 }}
                                whileTap={{ scale: 0.98 }}
                                transition={{ type: "spring", stiffness: 400 }}
                                className="inline-block"
                            >
                                <Link
                                    href="/assess"
                                    className="inline-flex items-center justify-center gap-2 px-10 py-5 text-xl font-bold text-white bg-gradient-to-r from-[#A897C6] to-[#9787B6] rounded-xl shadow-lg shadow-[#A897C6]/30 hover:shadow-xl hover:shadow-[#A897C6]/40 transition-shadow duration-300"
                                >
                                    Start Your Free Assessment
                                    <motion.span
                                        animate={{ x: [0, 4, 0] }}
                                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                                    >
                                        <ArrowRightIcon className="w-6 h-6" />
                                    </motion.span>
                                </Link>
                            </motion.div>
                        </motion.div>

                        <motion.p
                            className="mt-4 text-sm text-gray-500"
                            variants={fadeIn}
                            transition={{ duration: 0.5, delay: 0.3 }}
                        >
                            Free • Private • No account required
                        </motion.p>
                    </motion.div>
                </div>
            </section>

            {/* Footer */}
            <motion.footer
                className="bg-[#F8F7FC] border-t border-gray-100"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
            >
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <motion.div
                            className="flex items-center gap-3"
                            whileHover={{ scale: 1.02 }}
                        >
                            <div className="w-10 h-10 relative">
                                <Image
                                    src="/bruno/bruno-thinking-cropped.png"
                                    alt="Bruno"
                                    fill
                                    className="object-contain"
                                />
                            </div>
                            <span className="font-bold text-gray-900">Bruno</span>
                        </motion.div>

                        <div className="flex items-center gap-6 text-sm text-gray-500">
                            <motion.a
                                href="#"
                                className="hover:text-[#A897C6] transition-colors"
                                whileHover={{ y: -2 }}
                            >
                                Privacy Policy
                            </motion.a>
                            <motion.a
                                href="#"
                                className="hover:text-[#A897C6] transition-colors"
                                whileHover={{ y: -2 }}
                            >
                                Terms of Service
                            </motion.a>
                        </div>

                        <p className="text-sm text-gray-400">
                            © {new Date().getFullYear()} Bruno. All rights reserved.
                        </p>
                    </div>

                    <div className="mt-8 pt-8 border-t border-gray-200">
                        <p className="text-xs text-gray-400 text-center max-w-3xl mx-auto">
                            <strong>Disclaimer:</strong> Bruno provides informational estimates only and is not a substitute for official guidance.
                            Your actual eligibility will be determined by your state&apos;s unemployment office when you file a claim.
                        </p>
                    </div>
                </div>
            </motion.footer>
        </div>
    );
}

export default LandingPage;
