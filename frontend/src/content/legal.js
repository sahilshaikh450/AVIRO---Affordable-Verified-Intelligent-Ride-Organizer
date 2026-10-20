// Shared text for the Privacy Policy and Terms of Service pages and the Settings popups
export const LEGAL_LAST_UPDATED = 'October 2026';

export const PRIVACY_SECTIONS = [
  { title: '1. Information We Collect', content: 'We collect information you provide during registration such as your name, college email address, gender, and college ID card image. We also collect ride booking data, payment method (UPI/cash), location data during active rides, and chat messages between riders and drivers.' },
  { title: '2. How We Use Your Information', content: 'Your information is used to verify your college identity using AI, match you with compatible riders/drivers, process bookings and payments, enable real-time GPS tracking during rides, send OTP and booking notifications via email, and improve platform safety and experience.' },
  { title: '3. Location Data', content: 'AVIRO collects your GPS location only during active rides when you choose to share it. Location data is used exclusively for live tracking between confirmed ride partners. We do not store your location history after the ride ends.' },
  { title: '4. College ID Verification', content: 'Your college ID image is processed by Google Gemini Vision API for automatic verification. The image is stored securely on our servers and is only visible to platform administrators for manual review if needed.' },
  { title: '5. Data Sharing', content: 'We share your name, college name, gender, rating, and vehicle details with matched riders/drivers for booking purposes. Phone numbers are shared only after ride confirmation. We do not sell your personal data to third parties.' },
  { title: '6. Data Security', content: 'All data is encrypted in transit using HTTPS/TLS. Passwords are hashed using BCrypt. JWT tokens expire after 24 hours. We use secure cloud infrastructure (Aiven, Upstash) for data storage.' },
  { title: '7. Your Rights', content: 'You can update your profile information anytime. You can delete your account anytime from Settings → Delete Account; your personal data and college ID image are removed. You can withdraw location sharing at any time during a ride.' },
  { title: '8. Contact Us', content: 'For privacy concerns, contact us at: aviro.support@gmail.com' },
];

export const TERMS_SECTIONS = [
  { title: '1. Eligibility', content: 'AVIRO is exclusively for verified college students in Pune. You must upload a valid college ID card to use ride booking and offering features. You must be 18 years or older to use this platform.' },
  { title: '2. User Responsibilities', content: 'You agree to provide accurate information during registration. You must not impersonate another person or use a fake college ID. You are responsible for the accuracy of ride details you post as a driver.' },
  { title: '3. Ride Booking Rules', content: 'Drivers must honor confirmed bookings. Cancellations must be made in advance. Repeated cancellations may result in account suspension. Riders must arrive at the agreed pickup point on time.' },
  { title: '4. Payments', content: 'All payments are between riders and drivers directly. AVIRO does not process or hold any payments. For UPI payments, the transaction is between the student\'s UPI app and the driver. For cash, the driver must confirm receipt.' },
  { title: '5. Safety', content: 'Both riders and drivers must treat each other with respect. Any form of harassment, inappropriate behavior, or unsafe driving should be reported immediately using the Report Driver feature or SOS button.' },
  { title: '6. Prohibited Activities', content: 'You must not use AVIRO for commercial taxi services. You must not discriminate based on gender (except women-only rides), religion, or caste. You must not share false location data or manipulate the tracking system.' },
  { title: '7. Liability', content: 'AVIRO is a peer-to-peer platform connecting students. AVIRO is not responsible for the conduct of individual users during rides. We strongly recommend using the SOS feature and sharing your trip with family.' },
  { title: '8. Account Termination', content: 'AVIRO reserves the right to suspend or terminate accounts that violate these terms, receive multiple serious complaints, or engage in fraudulent activity.' },
  { title: '9. Changes to Terms', content: 'We may update these terms from time to time. Continued use of AVIRO after changes constitutes acceptance of the new terms.' },
  { title: '10. Contact', content: 'For any questions about these terms: aviro.support@gmail.com' },
];
