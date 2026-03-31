import React, { useState, useEffect, useRef, useCallback } from 'react';
import { NFCService } from './nfc-service';
import { scanDocumentMRZ, MRZScanError, MRZScanResult } from './mrz-service';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, User } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, onSnapshot, serverTimestamp, Timestamp, addDoc } from 'firebase/firestore';
import { UserProfile, UserTier, Vehicle, PaymentRecord, Hub, BankAccount, BankTransaction, HousingApplication, PRApplication } from './types';
import { translations, Language } from './translations';
import { Button, Input, Card, Badge } from './components/UI';
import { cn } from './lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Car, MapPin, Train, Bot, MoreHorizontal, Bell, Settings, 
  ChevronRight, ArrowLeft, Check, AlertCircle, Calendar, 
  ShoppingBag, Utensils, Info, LogOut, User as UserIcon,
  CreditCard, History, Zap, Search, Clock, Cloud,
  Building2, Heart, ShieldCheck, Vote, Home, Activity,
  Camera, ScanFace, FileText, Landmark, ArrowRight, Loader2, SmartphoneNfc, UploadCloud, CheckSquare, Square, CheckCircle2
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import Markdown from 'react-markdown';

// --- Constants ---
const APP_NAME = "MyLennox";
const APP_TAGLINE = "Your Lennox, in your pocket";
const APP_TAGLINE_GAELIC = "An Lennox agad, nad phòcaid";

// --- Main App Component ---
export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState<
    'welcome' | 'login' | 'lennoxpass-method' | 'lennoxpass-nfc' | 'lennoxpass-manual' | 'lennoxpass-mrz' |
    'lennoxpass-success' | 'lennoxpass-details' | 'account-type' | 'details' | 'sms' |
    'work' | 'vehicle' | 'permissions' | 'guest-explanation' | 'success' | 'dashboard'
  >('welcome');
  const [registrationData, setRegistrationData] = useState<Partial<UserProfile & { password?: string, plate?: string }>>({});
  const [isGuest, setIsGuest] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'home' | 'transport' | 'hub' | 'assistant' | 'more' | 'housing' | 'health' | 'banking'>('home');
  const [language, setLanguage] = useState<Language>('en');
  const [isDemo, setIsDemo] = useState(false);

  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [bankTransactions, setBankTransactions] = useState<BankTransaction[]>([]);
  const [housingApplications, setHousingApplications] = useState<HousingApplication[]>([]);
  const [prApplications, setPrApplications] = useState<PRApplication[]>([]);

  const t = translations[language];

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (isDemo) return;
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const docRef = doc(db, 'users', firebaseUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
            setScreen('dashboard');
          } else {
            // If user exists but no profile, they might be in registration
            if (screen === 'welcome') setScreen('account-type');
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
        }
      } else {
        setProfile(null);
        setScreen('welcome');
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [isDemo]);

  // Data Listeners (only if logged in)
  useEffect(() => {
    if ((!user && !isDemo) || !profile) return;

    if (isDemo) {
      setVehicles([
        { id: 'v1', uid: profile.uid, plate: 'SG19 XYZ', make: 'Tesla', model: 'Model 3', color: 'Midnight Silver', autoPayEnabled: false, createdAt: new Date().toISOString() }
      ]);
      setPayments([
        { id: 'p1', uid: profile.uid, amount: 25, type: 'congestion', status: 'unpaid', timestamp: new Date().toISOString(), entryTime: '8:14 AM' }
      ]);
      setBankAccounts([
        { id: 'b1', uid: profile.uid, accountNumber: '99004562', sortCode: 'LX-99-00', balance: 12450.50, currency: 'L$', type: 'current', createdAt: new Date().toISOString() },
        { id: 'b2', uid: profile.uid, accountNumber: '99004563', sortCode: 'LX-99-00', balance: 50000.00, currency: 'L$', type: 'savings', createdAt: new Date().toISOString() }
      ]);
      setBankTransactions([
        { id: 't1', accountId: 'b1', uid: profile.uid, amount: 150.00, type: 'debit', description: 'Grocery Store', category: 'Food', date: new Date().toISOString(), status: 'completed' },
        { id: 't2', accountId: 'b1', uid: profile.uid, amount: 2500.00, type: 'credit', description: 'Salary', category: 'Income', date: new Date(Date.now() - 86400000 * 2).toISOString(), status: 'completed' }
      ]);
      setHousingApplications([]);
      setPrApplications([]);
      return;
    }

    const uid = isDemo ? profile.uid : user?.uid;
    if (!uid) return;

    const vQuery = query(collection(db, 'vehicles'), where('uid', '==', uid));
    const vUnsub = onSnapshot(vQuery, (snap) => {
      setVehicles(snap.docs.map(d => ({ id: d.id, ...d.data() } as Vehicle)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'vehicles'));

    const pQuery = query(collection(db, 'payments'), where('uid', '==', uid));
    const pUnsub = onSnapshot(pQuery, (snap) => {
      setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() } as PaymentRecord)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'payments'));

    const bQuery = query(collection(db, 'bank_accounts'), where('uid', '==', uid));
    const bUnsub = onSnapshot(bQuery, (snap) => {
      setBankAccounts(snap.docs.map(d => ({ id: d.id, ...d.data() } as BankAccount)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'bank_accounts'));

    const btQuery = query(collection(db, 'bank_transactions'), where('uid', '==', uid));
    const btUnsub = onSnapshot(btQuery, (snap) => {
      setBankTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() } as BankTransaction)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'bank_transactions'));

    const hQuery = query(collection(db, 'housing_applications'), where('uid', '==', uid));
    const hUnsub = onSnapshot(hQuery, (snap) => {
      setHousingApplications(snap.docs.map(d => ({ id: d.id, ...d.data() } as HousingApplication)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'housing_applications'));

    const prQuery = query(collection(db, 'pr_applications'), where('uid', '==', uid));
    const prUnsub = onSnapshot(prQuery, (snap) => {
      setPrApplications(snap.docs.map(d => ({ id: d.id, ...d.data() } as PRApplication)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'pr_applications'));

    return () => {
      vUnsub();
      pUnsub();
      bUnsub();
      btUnsub();
      hUnsub();
      prUnsub();
    };
  }, [user, profile]);

  const handleDemoLogin = (tier: UserTier) => {
    setIsDemo(true);
    const mockProfile: UserProfile = {
      uid: `demo-${tier}`,
      firstName: tier === UserTier.CITIZEN ? 'Duncan' : 'Sarah',
      lastName: tier === UserTier.CITIZEN ? 'Fraser' : 'Miller',
      email: tier === UserTier.CITIZEN ? 'duncan@lennox.gov' : 'sarah.miller@shipyards.com',
      tier: tier,
      workplace: tier === UserTier.WORKER ? 'Lennox Marine Shipyards - Dumbarton' : undefined,
      nearestHub: tier === UserTier.WORKER ? 'Dumbarton Riverfront Hub' : undefined,
      workStartDate: tier === UserTier.WORKER ? '2022-03-24T00:00:00Z' : undefined,
      lennoxPassId: tier === UserTier.CITIZEN ? 'LX-990-456-DF' : undefined,
      placeOfBirth: tier === UserTier.CITIZEN ? 'Dumbarton, Lennox' : undefined,
      occupation: tier === UserTier.CITIZEN ? 'Marine Engineer' : undefined,
      lhdbUnit: tier === UserTier.CITIZEN ? 'Lennox Heights, Block A, Unit 402' : undefined,
      createdAt: new Date().toISOString(),
    };
    setProfile(mockProfile);
    setScreen('dashboard');
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#E4E3E0]">
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="text-2xl font-bold tracking-tighter"
        >
          {APP_NAME}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-[#E4E3E0] text-[#141414] font-sans overflow-hidden flex flex-col items-center">
      <div className="w-full max-w-md h-full bg-white relative shadow-2xl overflow-y-auto scrollbar-hide">
        <AnimatePresence mode="wait">
          {screen === 'welcome' && <WelcomeScreen onNext={(s) => setScreen(s)} language={language} onGuest={() => { setIsGuest(true); setScreen('guest-explanation'); }} />}
          {screen === 'login' && <LoginScreen onBack={() => setScreen('welcome')} onNext={() => setScreen('dashboard')} onDemoLogin={handleDemoLogin} language={language} />}
          {screen === 'lennoxpass-method' && <LennoxpassVerificationMethodScreen onBack={() => setScreen('welcome')} onNext={(s) => setScreen(s)} language={language} />}
          {screen === 'lennoxpass-nfc' && <NFCScreen onBack={() => setScreen('lennoxpass-method')} onNext={(data) => { setRegistrationData(prev => ({ ...prev, ...data })); setScreen('lennoxpass-success'); }} language={language} />}
          {screen === 'lennoxpass-mrz' && <MRZScannerScreen onBack={() => setScreen('lennoxpass-method')} onNext={(data) => { setRegistrationData(prev => ({ ...prev, ...data })); setScreen('lennoxpass-success'); }} language={language} />}
          {screen === 'lennoxpass-manual' && <ManualEntryScreen onBack={() => setScreen('lennoxpass-method')} onNext={(data) => { setRegistrationData(prev => ({ ...prev, ...data })); setScreen('lennoxpass-success'); }} language={language} />}
          {screen === 'lennoxpass-success' && <VerificationSuccessScreen onBack={() => setScreen('lennoxpass-method')} onNext={(data) => { setRegistrationData(prev => ({ ...prev, ...data })); setScreen('details'); }} language={language} scannedLennoxPassId={registrationData.lennoxPassId} />}
          {screen === 'lennoxpass-details' && <LennoxpassDetailsScreen onBack={() => setScreen('details')} initialData={registrationData} onNext={(data) => { setRegistrationData(prev => ({ ...prev, ...data })); setScreen('permissions'); }} language={language} />}
          {screen === 'account-type' && <AccountTypeSelectionScreen onBack={() => setScreen('welcome')} onNext={(data) => { setRegistrationData(prev => ({ ...prev, ...data })); setScreen('details'); }} language={language} />}
          {screen === 'details' && <DetailsScreen onBack={() => setScreen(registrationData.tier === UserTier.CITIZEN || registrationData.tier === UserTier.PR ? 'lennoxpass-success' : 'account-type')} tier={registrationData.tier!} initialData={registrationData} onNext={(data) => { setRegistrationData(prev => ({ ...prev, ...data })); setScreen('sms'); }} language={language} />}
          {screen === 'sms' && <SMSScreen onBack={() => setScreen('details')} onNext={() => {
            if (registrationData.tier === UserTier.CITIZEN || registrationData.tier === UserTier.PR) {
              setScreen('lennoxpass-details');
            } else if (registrationData.tier === UserTier.TOURIST) {
              setScreen('permissions');
            } else {
              setScreen('work');
            }
          }} language={language} />}
          {screen === 'work' && <WorkDetailsScreen onBack={() => setScreen('sms')} onNext={(data) => { setRegistrationData(prev => ({ ...prev, ...data })); setScreen('vehicle'); }} language={language} />}
          {screen === 'vehicle' && <VehicleDetailsScreen onBack={() => setScreen('work')} onNext={(data) => { setRegistrationData(prev => ({ ...prev, ...data })); setScreen('permissions'); }} language={language} />}
          {screen === 'permissions' && <PermissionsScreen onBack={() => {
            if (registrationData.tier === UserTier.CITIZEN || registrationData.tier === UserTier.PR) {
              setScreen('lennoxpass-details');
            } else if (registrationData.tier === UserTier.TOURIST) {
              setScreen('sms');
            } else {
              setScreen('vehicle');
            }
          }} onNext={async (data) => {
            const finalData = { ...registrationData, ...data };
            try {
              console.log('Starting registration with data:', { ...finalData, password: '***' });
              
              if (!finalData.email || !finalData.password) {
                throw new Error('Email and password are required for account creation.');
              }

              const userCred = await createUserWithEmailAndPassword(auth, finalData.email, finalData.password);
              console.log('Auth account created:', userCred.user.uid);

              const profileData: UserProfile = {
                uid: userCred.user.uid,
                firstName: finalData.firstName || '',
                lastName: finalData.lastName || '',
                email: finalData.email || '',
                phone: finalData.phone || '',
                nationality: finalData.nationality || '',
                dob: finalData.dob || '',
                tier: finalData.tier || UserTier.TOURIST,
                workplace: finalData.workplace || '',
                nearestHub: finalData.nearestHub || '',
                commuteType: finalData.commuteType || [],
                lennoxPassId: finalData.lennoxPassId || '',
                placeOfBirth: finalData.placeOfBirth || '',
                occupation: finalData.occupation || '',
                lhdbUnit: finalData.lhdbUnit || '',
                createdAt: new Date().toISOString()
              };

              console.log('Saving profile to Firestore...');
              await setDoc(doc(db, 'users', userCred.user.uid), profileData);
              console.log('Profile saved successfully');

              if (finalData.plate) {
                const vehicleId = Math.random().toString(36).substring(7);
                const vehicleData: Vehicle = {
                  id: vehicleId,
                  uid: userCred.user.uid,
                  plate: finalData.plate,
                  make: 'Unknown',
                  model: 'Unknown',
                  color: 'Unknown',
                  registeredCountry: finalData.nationality || 'UK',
                  autoPayEnabled: true,
                  createdAt: new Date().toISOString()
                };
                console.log('Saving vehicle data...');
                await setDoc(doc(db, 'vehicles', vehicleId), vehicleData);
                console.log('Vehicle data saved');
              }

              setProfile(profileData);
              setScreen('success');
            } catch (error: any) {
              console.error('Registration error:', error);
              
              const t = translations[language];
              let errorMessage = t.error_registration_failed;
              
              const code = String(error.code || '').toLowerCase();
              const message = String(error.message || '').toLowerCase();
              
              if (code.includes('email-already-in-use') || message.includes('email-already-in-use')) {
                errorMessage = t.error_email_in_use;
              } else if (code.includes('invalid-email') || message.includes('invalid-email')) {
                errorMessage = t.error_invalid_email;
              } else if (code.includes('weak-password') || message.includes('weak-password')) {
                errorMessage = t.error_weak_password;
              } else if (code.includes('invalid-credential') || message.includes('invalid-credential')) {
                errorMessage = t.error_invalid_credentials;
              } else if (error instanceof Error && error.message.includes('permission')) {
                handleFirestoreError(error, OperationType.WRITE, 'users/' + (auth.currentUser?.uid || 'unknown'));
                errorMessage = error.message;
              } else if (error instanceof Error) {
                errorMessage = error.message;
              } else if (typeof error === 'string') {
                errorMessage = error;
              }
              
              alert(errorMessage);
            }
          }} language={language} tier={registrationData.tier!} />}
          {screen === 'guest-explanation' && <GuestModeExplanationScreen onBack={() => setScreen('welcome')} onNext={(s) => setScreen(s)} language={language} />}
          {screen === 'success' && <SuccessScreen profile={profile!} onNext={() => setScreen('dashboard')} language={language} />}
          {screen === 'dashboard' && (profile || isGuest) && (
            <Dashboard 
              profile={profile || { uid: 'guest', firstName: 'Guest', lastName: 'User', email: '', tier: UserTier.TOURIST, createdAt: '' }} 
              isGuest={isGuest}
              vehicles={vehicles} 
              payments={payments} 
              bankAccounts={bankAccounts}
              bankTransactions={bankTransactions}
              housingApplications={housingApplications}
              prApplications={prApplications}
              setHousingApplications={setHousingApplications}
              setPrApplications={setPrApplications}
              activeTab={activeTab} 
              setActiveTab={setActiveTab} 
              language={language}
              setLanguage={setLanguage}
              isDemo={isDemo}
              setIsDemo={setIsDemo}
              setProfile={setProfile}
              setScreen={setScreen}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// --- Registration Screens ---

function LoginScreen({ onBack, onNext, onDemoLogin, language }: { onBack: () => void; onNext: () => void; onDemoLogin: (tier: UserTier) => void; language: Language }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const t = translations[language];

  const handleLogin = async () => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Auth listener will handle the rest
    } catch (error: any) {
      console.error('Login error:', error);
      
      const t = translations[language];
      let errorMessage = t.error_login_failed;
      
      const code = String(error.code || '').toLowerCase();
      const message = String(error.message || '').toLowerCase();
      
      if (code.includes('user-not-found') || code.includes('wrong-password') || code.includes('invalid-credential') || 
          message.includes('user-not-found') || message.includes('wrong-password') || message.includes('invalid-credential')) {
        errorMessage = t.error_invalid_credentials;
      } else if (code.includes('invalid-email') || message.includes('invalid-email')) {
        errorMessage = t.error_invalid_email;
      } else if (code.includes('user-disabled') || message.includes('user-disabled')) {
        errorMessage = t.error_user_disabled;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}
      className="p-8 flex flex-col h-full"
    >
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-2 hover:bg-[#141414]/5 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-bold tracking-tight">{t.sign_in}</h2>
      </div>

      <div className="flex-1 space-y-4">
        <p className="text-lg font-medium mb-6">{t.welcome_back}</p>
        <Input label={t.email_address} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" />
        <Input label={t.password} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
      </div>

      <div className="space-y-4">
        <Button disabled={!email || !password || loading} className="w-full" onClick={handleLogin}>
          {loading ? t.signing_in : t.sign_in.toUpperCase()}
        </Button>
        
        <div className="relative py-4">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#141414]/10"></div></div>
          <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold"><span className="bg-white px-2 text-[#141414]/40">{t.demo_access}</span></div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" className="text-[10px] py-2" onClick={() => onDemoLogin(UserTier.CITIZEN)}>{t.demo_citizen}</Button>
          <Button variant="outline" className="text-[10px] py-2" onClick={() => onDemoLogin(UserTier.WORKER)}>{t.demo_worker}</Button>
        </div>

        <Button variant="ghost" className="w-full text-xs" onClick={() => onBack()}>
          {t.no_account}
        </Button>
      </div>
    </motion.div>
  );
}

function WelcomeScreen({ onNext, onGuest, language }: { onNext: (s: any) => void; onGuest: () => void; language: Language }) {
  const t = translations[language];
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
      className="p-8 flex flex-col h-full bg-white"
    >
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-6">
        <div className="w-20 h-20 bg-[#141414] rounded-3xl flex items-center justify-center text-white text-4xl font-bold">L</div>
        <div>
          <h1 className="text-3xl font-bold tracking-tighter">{t.welcome_title}</h1>
          <p className="text-[#141414]/60 font-medium">{t.welcome_tagline}</p>
          {language === 'en' && <p className="text-[#141414]/40 text-sm italic">{APP_TAGLINE_GAELIC}</p>}
        </div>
        <div className="w-full h-px bg-[#141414]/10 my-4" />
        <p className="text-sm font-bold text-[#141414]/80 uppercase tracking-widest">
          {t.signup_prompt}
        </p>
      </div>

      <div className="space-y-4 pb-8">
        <Card className="p-4 border-2 border-[#141414]/5 hover:border-[#141414] transition-all cursor-pointer group" onClick={() => onNext('lennoxpass-method')}>
          <div className="flex items-start gap-4">
            <div className="text-2xl">🎫</div>
            <div className="flex-1">
              <p className="font-bold text-sm">{t.have_lennoxpass}</p>
              <p className="text-[10px] text-[#141414]/60 mb-2">{t.have_lennoxpass_desc}</p>
              <div className="space-y-1">
                <p className="text-[9px] font-bold text-[#141414]/40 uppercase tracking-widest">{t.lennoxpass_benefits}</p>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                  <p className="text-[9px] font-medium flex items-center gap-1">✅ {t.benefit_full_features}</p>
                  <p className="text-[9px] font-medium flex items-center gap-1">✅ {t.benefit_digital_id}</p>
                  <p className="text-[9px] font-medium flex items-center gap-1">✅ {t.benefit_lhdb_housing}</p>
                  <p className="text-[9px] font-medium flex items-center gap-1">✅ {t.benefit_free_metro}</p>
                  <p className="text-[9px] font-medium flex items-center gap-1">✅ {t.benefit_lhs_health}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <Button className="w-full py-2 text-[10px] font-bold tracking-widest">{t.signup_with_lennoxpass}</Button>
          </div>
        </Card>

        <Card className="p-4 border-2 border-[#141414]/5 hover:border-[#141414] transition-all cursor-pointer group" onClick={() => onNext('account-type')}>
          <div className="flex items-start gap-4">
            <div className="text-2xl">🌍</div>
            <div className="flex-1">
              <p className="font-bold text-sm">{t.no_lennoxpass}</p>
              <p className="text-[10px] text-[#141414]/60 mb-2">{t.no_lennoxpass_desc}</p>
              <div className="space-y-1">
                <p className="text-[9px] font-bold text-[#141414]/40 uppercase tracking-widest">{t.lennoxpass_benefits}</p>
                <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                  <p className="text-[9px] font-medium flex items-center gap-1">✅ {t.benefit_transport_payments}</p>
                  <p className="text-[9px] font-medium flex items-center gap-1">✅ {t.benefit_hub_directory}</p>
                  <p className="text-[9px] font-medium flex items-center gap-1">✅ {t.benefit_metro_planner}</p>
                  <p className="text-[9px] font-medium flex items-center gap-1">✅ {t.benefit_ai_chatbot}</p>
                  <p className="text-[9px] font-medium flex items-center gap-1">✅ {t.benefit_tourist_info}</p>
                </div>
              </div>
              <p className="text-[9px] font-bold text-amber-600 mt-2 uppercase tracking-tight">⚠️ {t.limited_access_warning}</p>
            </div>
          </div>
          <div className="mt-4">
            <Button variant="outline" className="w-full py-2 text-[10px] font-bold tracking-widest">{t.create_account_btn}</Button>
          </div>
        </Card>

        <Card className="p-4 border-2 border-[#141414]/5 hover:border-[#141414] transition-all cursor-pointer group" onClick={onGuest}>
          <div className="flex items-start gap-4">
            <div className="text-2xl">👀</div>
            <div className="flex-1">
              <p className="font-bold text-sm">{t.browse_guest}</p>
              <p className="text-[10px] text-[#141414]/60 mb-2">{t.browse_guest_desc}</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[9px] font-bold text-[#141414]/40 uppercase tracking-widest">{t.guest_benefits}</p>
                  <p className="text-[9px] font-medium flex items-center gap-1">✅ {t.guest_benefit_hub}</p>
                  <p className="text-[9px] font-medium flex items-center gap-1">✅ {t.guest_benefit_metro}</p>
                  <p className="text-[9px] font-medium flex items-center gap-1">✅ {t.guest_benefit_tourist}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-bold text-red-600/60 uppercase tracking-widest">{t.guest_limitations}</p>
                  <p className="text-[9px] font-medium flex items-center gap-1 text-red-600/60">❌ {t.guest_limit_prefs}</p>
                  <p className="text-[9px] font-medium flex items-center gap-1 text-red-600/60">❌ {t.guest_limit_pay}</p>
                  <p className="text-[9px] font-medium flex items-center gap-1 text-red-600/60">❌ {t.guest_limit_chatbot}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <Button variant="ghost" className="w-full py-2 text-[10px] font-bold tracking-widest">{t.continue_as_guest}</Button>
          </div>
        </Card>

        <div className="pt-4 text-center">
          <p className="text-xs text-[#141414]/60 mb-3">{t.already_have_account}</p>
          <Button variant="outline" className="w-full py-3 text-xs font-bold tracking-widest" onClick={() => onNext('login')}>
            {t.sign_in.toUpperCase()}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

function LennoxpassVerificationMethodScreen({ onBack, onNext, language }: { onBack: () => void; onNext: (s: any) => void; language: Language }) {
  const t = translations[language];
  return (
    <motion.div 
      initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}
      className="p-8 flex flex-col h-full bg-white"
    >
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-2 hover:bg-[#141414]/5 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-bold tracking-tight">{t.verify_lennoxpass_title}</h2>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto pr-2 scrollbar-hide">
        <p className="text-lg font-medium mb-2">{t.verify_method_prompt}</p>
        
        <Card className="p-5 border-2 border-[#141414]/5 hover:border-[#141414] transition-all cursor-pointer group" onClick={() => onNext('lennoxpass-nfc')}>
          <div className="flex items-start gap-4">
            <div className="text-2xl">📱</div>
            <div>
              <p className="font-bold text-sm">{t.scan_nfc}</p>
              <p className="text-[10px] text-[#141414]/60 mb-3">{t.scan_nfc_desc}</p>
              <p className="text-[10px] font-medium leading-relaxed">{t.scan_nfc_instruction}</p>
            </div>
          </div>
          <Button className="w-full mt-4 py-2 text-[10px] font-bold tracking-widest">{t.tap_to_scan}</Button>
        </Card>

        <Card className="p-5 border-2 border-[#141414]/5 hover:border-[#141414] transition-all cursor-pointer group" onClick={() => onNext('lennoxpass-manual')}>
          <div className="flex items-start gap-4">
            <div className="text-2xl">🔢</div>
            <div>
              <p className="font-bold text-sm">{t.enter_manually}</p>
              <p className="text-[10px] text-[#141414]/60 mb-3">{t.enter_manually_desc}</p>
              <p className="text-[10px] font-medium leading-relaxed">
                {t.enter_manually_instruction}<br/>
                <span className="opacity-60">{t.enter_manually_instruction_sub}</span>
              </p>
            </div>
          </div>
          <Button variant="outline" className="w-full mt-4 py-2 text-[10px] font-bold tracking-widest">{t.enter_manually_btn}</Button>
        </Card>

        <Card className="p-5 border-2 border-[#141414]/5 hover:border-[#141414] transition-all cursor-pointer group" onClick={() => onNext('lennoxpass-mrz')}>
          <div className="flex items-start gap-4">
            <div className="text-2xl">📸</div>
            <div>
              <p className="font-bold text-sm">{t.scan_camera}</p>
              <p className="text-[10px] text-[#141414]/60 mb-3">{t.scan_camera_desc}</p>
              <p className="text-[10px] font-medium leading-relaxed">{t.scan_camera_instruction}</p>
            </div>
          </div>
          <Button className="w-full mt-4 py-2 text-[10px] font-bold tracking-widest">{t.scan_camera_btn}</Button>
        </Card>

        <div className="flex items-start gap-2 p-4 bg-blue-50 rounded-2xl">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-[10px] font-medium text-blue-800 leading-relaxed">{t.secure_verification_info}</p>
        </div>
      </div>
    </motion.div>
  );
}

type NFCScreenState = 'checking' | 'not-supported' | 'disabled' | 'scanning' | 'success' | 'error';

function NFCScreen({ onBack, onNext, language }: { onBack: () => void; onNext: (data: { lennoxPassId: string }) => void; language: Language }) {
  const t = translations[language];
  const [state, setState] = useState<NFCScreenState>('checking');
  const [errorMsg, setErrorMsg] = useState('');
  const cleanupRef = useRef<(() => Promise<void>) | null>(null);

  const handleTag = useCallback((result: { lennoxPassId: string }) => {
    setState('success');
    cleanupRef.current?.();
    cleanupRef.current = null;
    setTimeout(() => onNext({ lennoxPassId: result.lennoxPassId }), 900);
  }, [onNext]);

  const handleError = useCallback((msg: string) => {
    setErrorMsg(msg);
    setState('error');
  }, []);

  const startScan = useCallback(async () => {
    setState('checking');
    setErrorMsg('');

    const supported = await NFCService.isSupported();
    if (!supported) {
      setState('not-supported');
      return;
    }
    const enabled = await NFCService.isEnabled();
    if (!enabled) {
      setState('disabled');
      return;
    }

    setState('scanning');
    const cleanup = await NFCService.startScanning(handleTag, handleError);
    cleanupRef.current = cleanup;
  }, [handleTag, handleError]);

  useEffect(() => {
    startScan();
    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, [startScan]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="p-8 flex flex-col h-full bg-white items-center justify-center text-center"
    >
      <div className="flex-1 flex flex-col items-center justify-center gap-8">
        <div className="relative">
          {state === 'scanning' && (
            <motion.div
              animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute inset-0 bg-blue-500 rounded-full blur-3xl"
            />
          )}
          <div className={cn(
            "relative w-32 h-32 rounded-full flex items-center justify-center text-white",
            state === 'success' ? "bg-emerald-500" :
            state === 'error' || state === 'not-supported' || state === 'disabled' ? "bg-red-500" :
            "bg-[#141414]"
          )}>
            {state === 'success' ? (
              <Check className="w-12 h-12" />
            ) : state === 'checking' ? (
              <Loader2 className="w-12 h-12 animate-spin" />
            ) : (
              <SmartphoneNfc className={cn("w-12 h-12", state === 'scanning' ? "animate-pulse" : "")} />
            )}
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold tracking-tight mb-2">
            {state === 'checking' && 'Checking NFC...'}
            {state === 'not-supported' && 'NFC Not Available'}
            {state === 'disabled' && 'NFC is Disabled'}
            {state === 'scanning' && t.scanning_animation_text}
            {state === 'success' && t.verification_success}
            {state === 'error' && 'Scan Failed'}
          </h2>
          <p className="text-sm text-[#141414]/60 max-w-[220px]">
            {state === 'not-supported' && 'This device does not have NFC hardware. Please use manual entry instead.'}
            {state === 'disabled' && t.nfc_settings_info}
            {state === 'scanning' && t.scan_nfc_instruction}
            {state === 'success' && t.lennoxpass_verified_msg}
            {state === 'error' && (errorMsg || 'Could not read the NFC tag. Please try again.')}
          </p>
        </div>

        {state === 'scanning' && (
          <div className="space-y-4 w-full max-w-[240px]">
            <div className="h-1 bg-[#141414]/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                className="h-full w-1/3 bg-blue-500"
              />
            </div>
          </div>
        )}

        {state === 'disabled' && (
          <Button onClick={() => NFCService.openSettings()} className="mt-2">
            Open NFC Settings
          </Button>
        )}

        {state === 'error' && (
          <Button onClick={startScan} className="mt-2">
            Try Again
          </Button>
        )}
      </div>

      <Button variant="ghost" className="text-xs" onClick={onBack}>
        {t.nfc_trouble}
      </Button>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// MRZ Scanner Screen
// ---------------------------------------------------------------------------

type MRZScreenState = 'idle' | 'scanning' | 'processing' | 'success' | 'error';

interface MRZScreenData {
  lennoxPassId?: string;
  firstName?: string;
  lastName?: string;
  dob?: string;
  nationality?: string;
}

function MRZScannerScreen({ onBack, onNext, language }: { onBack: () => void; onNext: (data: MRZScreenData) => void; language: Language }) {
  const t = translations[language];
  const [state, setState] = useState<MRZScreenState>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [result, setResult] = useState<MRZScanResult | null>(null);

  const handleScan = useCallback(async () => {
    setState('scanning');
    setErrorMsg('');
    setProgress(0);

    try {
      const data = await scanDocumentMRZ((pct) => {
        setProgress(pct);
        if (pct >= 25) setState('processing');
      });
      setResult(data);
      setState('success');
    } catch (err: unknown) {
      const msg = err instanceof MRZScanError
        ? err.message
        : (err instanceof Error ? err.message : 'Scan failed. Please try again.');
      setErrorMsg(msg);
      setState('error');
    }
  }, []);

  const handleConfirm = () => {
    if (!result) return;
    onNext({
      lennoxPassId: result.documentNumber || undefined,
      firstName: result.firstName || undefined,
      lastName: result.lastName || undefined,
      dob: result.dob || undefined,
      nationality: result.nationality || undefined,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}
      className="p-8 flex flex-col h-full bg-white"
    >
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-2 hover:bg-[#141414]/5 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h2 className="text-xl font-bold tracking-tight">{t.scan_camera}</h2>
          <p className="text-[10px] font-bold text-[#141414]/40 uppercase tracking-widest">{t.scan_camera_desc}</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-6 overflow-y-auto">
        {/* Idle — show instructions */}
        {state === 'idle' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center">
            <div className="w-24 h-24 bg-[#141414] rounded-full flex items-center justify-center text-white">
              <Camera className="w-10 h-10" />
            </div>
            <div>
              <h3 className="font-bold text-lg mb-2">Scan your Lennoxpass</h3>
              <p className="text-sm text-[#141414]/60 max-w-[260px]">
                Place your Lennoxpass card face-up in good light. Point the camera at the bottom of the card where the two lines of small print are.
              </p>
            </div>
            <div className="w-full p-4 bg-amber-50 rounded-2xl border border-amber-100 text-left space-y-2">
              <p className="text-xs font-bold text-amber-800">Tips for best results:</p>
              <p className="text-[10px] text-amber-700">• Keep card flat and well-lit (avoid shadows)</p>
              <p className="text-[10px] text-amber-700">• Hold phone steady, 15–20 cm above the card</p>
              <p className="text-[10px] text-amber-700">• Make sure the two MRZ lines at the bottom are fully in frame</p>
            </div>
          </div>
        )}

        {/* Scanning / processing */}
        {(state === 'scanning' || state === 'processing') && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center">
            <div className="relative w-24 h-24">
              <motion.div
                animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.7, 0.4] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="absolute inset-0 bg-blue-400 rounded-full blur-2xl"
              />
              <div className="relative w-24 h-24 bg-[#141414] rounded-full flex items-center justify-center text-white">
                <ScanFace className="w-10 h-10 animate-pulse" />
              </div>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-1">
                {state === 'scanning' ? 'Opening camera…' : 'Reading MRZ…'}
              </h3>
              <p className="text-sm text-[#141414]/60">
                {state === 'processing' ? 'Extracting data from your card — this takes a few seconds.' : ''}
              </p>
            </div>
            {state === 'processing' && progress > 0 && (
              <div className="w-full max-w-[240px] space-y-2">
                <div className="h-1.5 bg-[#141414]/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-blue-500 rounded-full"
                    initial={{ width: '0%' }}
                    animate={{ width: `${progress}%` }}
                    transition={{ ease: 'easeOut' }}
                  />
                </div>
                <p className="text-[10px] text-[#141414]/40 text-center">{progress}%</p>
              </div>
            )}
          </div>
        )}

        {/* Success — show parsed data for confirmation */}
        {state === 'success' && result && (
          <div className="flex-1 flex flex-col gap-4">
            <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
              <Check className="w-5 h-5 text-emerald-600 shrink-0" />
              <p className="text-sm font-bold text-emerald-800">MRZ scan successful — please confirm your details</p>
            </div>
            <div className="bg-[#141414]/5 p-5 rounded-2xl space-y-4">
              {[
                { label: 'First Name', value: result.firstName },
                { label: 'Last Name', value: result.lastName },
                { label: 'Document No.', value: result.documentNumber },
                { label: 'Date of Birth', value: result.dob },
                { label: 'Nationality', value: result.nationality },
              ].filter(f => f.value).map(f => (
                <div key={f.label} className="flex justify-between items-center">
                  <p className="text-[10px] font-bold text-[#141414]/40 uppercase tracking-widest">{f.label}</p>
                  <p className="font-bold text-sm">{f.value}</p>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-[#141414]/40 text-center italic">
              If any details look wrong, go back and use manual entry instead.
            </p>
          </div>
        )}

        {/* Error */}
        {state === 'error' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center">
            <div className="w-24 h-24 bg-red-500 rounded-full flex items-center justify-center text-white">
              <AlertCircle className="w-10 h-10" />
            </div>
            <div>
              <h3 className="font-bold text-lg mb-2">Scan Failed</h3>
              <p className="text-sm text-[#141414]/60 max-w-[240px]">{errorMsg}</p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom actions */}
      <div className="mt-6 space-y-3">
        {state === 'idle' && (
          <Button className="w-full py-4" onClick={handleScan}>
            <Camera className="w-4 h-4 mr-2" /> Open Camera
          </Button>
        )}
        {state === 'success' && (
          <Button className="w-full py-4" onClick={handleConfirm}>
            Confirm & Continue
          </Button>
        )}
        {state === 'error' && (
          <>
            <Button className="w-full py-4" onClick={handleScan}>
              Try Again
            </Button>
            <Button variant="ghost" className="w-full text-xs" onClick={onBack}>
              {t.nfc_trouble}
            </Button>
          </>
        )}
        {(state === 'idle' || state === 'success' || state === 'error') && (
          <Button variant="ghost" className="w-full text-xs opacity-60" onClick={onBack}>
            {t.nfc_trouble}
          </Button>
        )}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------

function ManualEntryScreen({ onBack, onNext, language }: { onBack: () => void; onNext: (d: any) => void; language: Language }) {
  const t = translations[language];
  const [number, setNumber] = useState('');

  return (
    <motion.div 
      initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}
      className="p-8 flex flex-col h-full bg-white"
    >
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-2 hover:bg-[#141414]/5 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-bold tracking-tight">{t.enter_manually}</h2>
      </div>

      <div className="flex-1 space-y-6">
        <p className="text-sm font-medium text-[#141414]/60">
          {t.enter_manually_instruction}
        </p>
        <Input 
          label={t.lennoxpass_id} 
          placeholder="1234-5678-9012" 
          value={number} 
          onChange={e => setNumber(e.target.value)}
          className="text-center text-xl font-mono tracking-widest"
        />
        <p className="text-[10px] text-[#141414]/40 text-center italic">
          {t.enter_manually_instruction_sub}
        </p>
      </div>

      <Button disabled={number.length < 12} className="w-full mt-8" onClick={() => onNext({ lennoxPassId: number })}>
        {t.continue}
      </Button>
    </motion.div>
  );
}

function VerificationSuccessScreen({ onBack, onNext, language, scannedLennoxPassId }: { onBack: () => void; onNext: (d: any) => void; language: Language; scannedLennoxPassId?: string }) {
  const t = translations[language];
  const [selectedTier, setSelectedTier] = useState<UserTier>(UserTier.CITIZEN);

  // Mock LHDB data — in production this would be a live LHDB lookup by lennoxPassId
  const mockData = {
    firstName: selectedTier === UserTier.CITIZEN ? 'Duncan' : 'Angus',
    lastName: selectedTier === UserTier.CITIZEN ? 'Fraser' : 'McDonald',
    // Prefer the real scanned ID; fall back to demo values
    lennoxPassId: scannedLennoxPassId ?? (selectedTier === UserTier.CITIZEN ? 'LX-990-456-DF' : '1234-5678-9012'),
    tier: selectedTier,
    dob: selectedTier === UserTier.CITIZEN ? '1985-04-12' : '1994-03-15',
    expiry: '2032-09-17',
    email: selectedTier === UserTier.CITIZEN ? 'duncan.fraser@lennox.gov' : 'angus.mcdonald@email.lx',
    phone: selectedTier === UserTier.CITIZEN ? '+44 7700 900456' : '+44 7700 900123',
    placeOfBirth: selectedTier === UserTier.CITIZEN ? 'Dumbarton, Lennox' : 'Glasgow, Scotland',
    occupation: selectedTier === UserTier.CITIZEN ? 'Marine Engineer' : 'Software Developer',
    lhdbUnit: selectedTier === UserTier.CITIZEN ? 'Lennox Heights, Block A, Unit 402' : 'Riverview Apts, Unit 12'
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
      className="p-8 flex flex-col h-full bg-white"
    >
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-6">
        <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center text-white">
          <Check className="w-10 h-10" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight mb-1">{t.verification_success}</h2>
          <p className="text-sm text-[#141414]/60">{t.lennoxpass_verified_msg}</p>
        </div>

        {/* Demo Toggle for testing flow */}
        <div className="flex gap-2 p-1 bg-[#141414]/5 rounded-xl w-full">
          <button 
            onClick={() => setSelectedTier(UserTier.CITIZEN)}
            className={cn("flex-1 py-2 text-[10px] font-bold rounded-lg transition-all", selectedTier === UserTier.CITIZEN ? "bg-white shadow-sm" : "opacity-40")}
          >
            CITIZEN
          </button>
          <button 
            onClick={() => setSelectedTier(UserTier.PR)}
            className={cn("flex-1 py-2 text-[10px] font-bold rounded-lg transition-all", selectedTier === UserTier.PR ? "bg-white shadow-sm" : "opacity-40")}
          >
            PERM. RESIDENT
          </button>
        </div>

        <div className="w-full h-px bg-[#141414]/10 my-2" />

        <div className="w-full space-y-4 text-left bg-[#141414]/5 p-6 rounded-3xl">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[9px] font-bold text-[#141414]/40 uppercase tracking-widest">{t.first_name}</p>
              <p className="font-bold text-sm">{mockData.firstName}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-[#141414]/40 uppercase tracking-widest">{t.last_name}</p>
              <p className="font-bold text-sm">{mockData.lastName}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-[#141414]/40 uppercase tracking-widest">{t.lennoxpass_id}</p>
              <p className="font-bold text-sm font-mono">{mockData.lennoxPassId}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-[#141414]/40 uppercase tracking-widest">{t.status}</p>
              <p className="font-bold text-sm">{selectedTier === UserTier.CITIZEN ? t.citizen_title : t.permanent_resident}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-[#141414]/40 uppercase tracking-widest">{t.dob}</p>
              <p className="font-bold text-sm">{new Date(mockData.dob).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-[#141414]/40 uppercase tracking-widest">{t.valid_until}</p>
              <p className="font-bold text-sm">{new Date(mockData.expiry).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        <div className="w-full h-px bg-[#141414]/10 my-2" />

        <div className="text-left w-full space-y-3">
          <p className="text-[10px] font-bold text-[#141414]/40 uppercase tracking-widest">{t.account_type} {(selectedTier === UserTier.CITIZEN ? t.citizen_title : t.permanent_resident).toUpperCase()}</p>
          <div className="grid grid-cols-1 gap-2">
            <p className="text-[10px] font-medium flex items-center gap-2">✅ {t.benefit_lhdb_housing}</p>
            <p className="text-[10px] font-medium flex items-center gap-2">✅ {t.benefit_free_metro}</p>
            <p className="text-[10px] font-medium flex items-center gap-2">✅ {t.benefit_lhs_health}</p>
            <p className="text-[10px] font-medium flex items-center gap-2">✅ {t.benefit_digital_id}</p>
            <p className="text-[10px] font-medium flex items-center gap-2">✅ {t.benefit_full_features}</p>
          </div>
          {selectedTier === UserTier.PR && (
            <p className="text-[9px] font-bold text-amber-600 leading-relaxed italic">
              ⚠️ {t.pr_voting_warning}
            </p>
          )}
        </div>
      </div>

      <Button className="w-full mt-8" onClick={() => onNext(mockData)}>
        {t.continue.toUpperCase()}
      </Button>
    </motion.div>
  );
}

function LennoxpassDetailsScreen({ onBack, onNext, language, initialData }: { onBack: () => void; onNext: (d: any) => void; language: Language; initialData?: any }) {
  const t = translations[language];
  const [form, setForm] = useState({
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    password: initialData?.password || '',
    confirmPassword: initialData?.password || '',
    enable2FA: true
  });

  const isValid = form.email && form.phone && form.password && form.password === form.confirmPassword && form.password.length >= 8;

  return (
    <motion.div 
      initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}
      className="p-8 flex flex-col h-full bg-white"
    >
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="p-2 hover:bg-[#141414]/5 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h2 className="text-xl font-bold tracking-tight">{t.complete_profile}</h2>
          <p className="text-[10px] font-bold text-[#141414]/40 uppercase tracking-widest">{t.step_1_of_2_security}</p>
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto pr-2 scrollbar-hide">
        <div className="h-1 bg-[#141414]/10 rounded-full w-full overflow-hidden">
          <div className="h-full bg-[#141414] w-1/2" />
        </div>

        <div className="space-y-4">
          <Input label={t.email_address} value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
          <p className="text-[9px] text-[#141414]/40 italic -mt-3">{t.lhdb_update_info}</p>
          
          <Input label={t.phone_mobile} value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
          <p className="text-[9px] text-[#141414]/40 italic -mt-3">{t.lhdb_update_info}</p>

          <Input label={t.password} type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
          <p className="text-[9px] text-[#141414]/40 italic -mt-3">(8+ characters, number, symbol)</p>

          <Input label={t.confirm_password} type="password" value={form.confirmPassword} onChange={e => setForm({...form, confirmPassword: e.target.value})} />
        </div>

        <div className="w-full h-px bg-[#141414]/10 my-2" />

        <div className="space-y-4">
          <p className="text-[10px] font-bold text-[#141414]/40 uppercase tracking-widest">{t.two_factor_auth_title}</p>
          <label className="flex items-center gap-3 p-4 bg-[#141414]/5 rounded-2xl cursor-pointer">
            <input type="checkbox" checked={form.enable2FA} onChange={e => setForm({...form, enable2FA: e.target.checked})} className="w-5 h-5 rounded border-[#141414]/20" />
            <p className="text-xs font-medium">{t.enable_2fa}</p>
          </label>
        </div>
      </div>

      <Button disabled={!isValid} className="w-full mt-8" onClick={() => onNext(form)}>
        {t.continue.toUpperCase()}
      </Button>
    </motion.div>
  );
}

function GuestModeExplanationScreen({ onBack, onNext, language }: { onBack: () => void; onNext: (s: any) => void; language: Language }) {
  const t = translations[language];
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
      className="p-8 flex flex-col h-full bg-white"
    >
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-2 hover:bg-[#141414]/5 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-bold tracking-tight">{t.guest_mode_title}</h2>
      </div>

      <div className="flex-1 space-y-8">
        <p className="text-lg font-medium text-[#141414]/60">{t.guest_mode_desc}</p>
        
        <div className="space-y-4">
          <p className="text-xs font-bold uppercase tracking-widest opacity-40">{t.what_you_can_do}</p>
          <div className="space-y-3">
            <p className="text-sm font-medium flex items-center gap-3">✅ {t.guest_benefit_hub}</p>
            <p className="text-sm font-medium flex items-center gap-3">✅ {t.guest_benefit_metro}</p>
            <p className="text-sm font-medium flex items-center gap-3">✅ {t.guest_benefit_tourist}</p>
            <p className="text-sm font-medium flex items-center gap-3">✅ {t.tourist_benefit_events}</p>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-xs font-bold uppercase tracking-widest opacity-40">{t.limitations}</p>
          <div className="space-y-3">
            <p className="text-sm font-medium flex items-center gap-3 text-red-600/60">❌ {t.guest_limit_prefs}</p>
            <p className="text-sm font-medium flex items-center gap-3 text-red-600/60">❌ {t.guest_limit_pay}</p>
            <p className="text-sm font-medium flex items-center gap-3 text-red-600/60">❌ {t.guest_limit_chatbot}</p>
            <p className="text-sm font-medium flex items-center gap-3 text-red-600/60">❌ {t.no_personalized}</p>
            <p className="text-sm font-medium flex items-center gap-3 text-red-600/60">❌ {t.no_notifications}</p>
          </div>
        </div>

        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
          <p className="text-xs font-bold text-amber-800 text-center">{t.guest_upgrade_prompt}</p>
        </div>
      </div>

      <div className="space-y-3 mt-8">
        <Button className="w-full" onClick={() => onNext('account-type')}>{t.create_account.toUpperCase()}</Button>
        <Button variant="ghost" className="w-full" onClick={() => onNext('dashboard')}>{t.continue_as_guest.toUpperCase()}</Button>
      </div>
    </motion.div>
  );
}

function VehicleDetailsScreen({ onBack, onNext, language }: { onBack: () => void; onNext: (d: any) => void; language: Language }) {
  const t = translations[language];
  const [drives, setDrives] = useState<'yes' | 'no'>('yes');
  const [plate, setPlate] = useState('');

  return (
    <motion.div 
      initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}
      className="p-8 flex flex-col h-full bg-white"
    >
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="p-2 hover:bg-[#141414]/5 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h2 className="text-xl font-bold tracking-tight">{t.step_3_of_4_vehicle}</h2>
          <p className="text-[10px] font-bold text-[#141414]/40 uppercase tracking-widest">{t.payments_vehicles}</p>
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto pr-2 scrollbar-hide">
        <div className="h-1 bg-[#141414]/10 rounded-full w-full overflow-hidden">
          <div className="h-full bg-[#141414] w-3/4" />
        </div>

        <div className="space-y-4">
          <p className="text-sm font-bold text-[#141414]/80">{t.drive_into_lennox_prompt}</p>
          <div className="space-y-2">
            <button 
              onClick={() => setDrives('yes')}
              className={cn("w-full p-4 rounded-2xl border-2 text-left transition-all flex items-center gap-3", drives === 'yes' ? 'border-[#141414] bg-[#141414]/5' : 'border-[#141414]/5')}
            >
              <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center", drives === 'yes' ? 'border-[#141414]' : 'border-[#141414]/20')}>
                {drives === 'yes' && <div className="w-2.5 h-2.5 rounded-full bg-[#141414]" />}
              </div>
              <p className="text-sm font-bold">{t.drive_occasionally_opt}</p>
            </button>
            <button 
              onClick={() => setDrives('no')}
              className={cn("w-full p-4 rounded-2xl border-2 text-left transition-all flex items-center gap-3", drives === 'no' ? 'border-[#141414] bg-[#141414]/5' : 'border-[#141414]/5')}
            >
              <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center", drives === 'no' ? 'border-[#141414]' : 'border-[#141414]/20')}>
                {drives === 'no' && <div className="w-2.5 h-2.5 rounded-full bg-[#141414]" />}
              </div>
              <p className="text-sm font-bold">{t.public_transport_only}</p>
            </button>
          </div>
        </div>

        {drives === 'yes' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <Input label={t.vehicle_reg_label} placeholder={t.plate_placeholder} value={plate} onChange={e => setPlate(e.target.value.toUpperCase())} className="text-xl font-bold tracking-widest" />
            <div className="flex items-start gap-2 p-4 bg-blue-50 rounded-2xl">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-[10px] font-medium text-blue-800 leading-relaxed">{t.vehicle_link_info}</p>
            </div>
            <Button variant="ghost" className="w-full text-xs">{t.add_another_vehicle_btn}</Button>
          </motion.div>
        )}
      </div>

      <div className="flex gap-3 mt-8">
        <Button variant="ghost" className="flex-1" onClick={() => onNext({})}>{t.skip_step}</Button>
        <Button disabled={drives === 'yes' && !plate} className="flex-1" onClick={() => onNext({ plate })}>{t.continue.toUpperCase()}</Button>
      </div>
    </motion.div>
  );
}

function AccountTypeSelectionScreen({ onBack, onNext, language }: { onBack: () => void; onNext: (d: any) => void; language: Language }) {
  const t = translations[language];
  return (
    <motion.div 
      initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}
      className="p-8 flex flex-col h-full bg-white"
    >
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-2 hover:bg-[#141414]/5 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-bold tracking-tight">{t.what_brings_prompt}</h2>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto pr-2 scrollbar-hide">
        <Card className="p-5 border-2 border-[#141414]/5 hover:border-[#141414] transition-all cursor-pointer group" onClick={() => onNext({ tier: UserTier.WORKER })}>
          <div className="flex items-start gap-4">
            <div className="text-2xl">👷</div>
            <div>
              <p className="font-bold text-sm">{t.worker_title}</p>
              <p className="text-[10px] text-[#141414]/60 mb-3">{t.worker_desc}</p>
              <div className="space-y-1">
                <p className="text-[9px] font-medium flex items-center gap-2">✅ {t.worker_benefit_tracking}</p>
                <p className="text-[9px] font-medium flex items-center gap-2">✅ {t.worker_benefit_pr}</p>
              </div>
            </div>
          </div>
          <Button className="w-full mt-4 py-2 text-[10px] font-bold tracking-widest">{t.select_worker}</Button>
        </Card>

        <Card className="p-5 border-2 border-[#141414]/5 hover:border-[#141414] transition-all cursor-pointer group" onClick={() => onNext({ tier: UserTier.TOURIST })}>
          <div className="flex items-start gap-4">
            <div className="text-2xl">📸</div>
            <div>
              <p className="font-bold text-sm">{t.tourist_title}</p>
              <p className="text-[10px] text-[#141414]/60 mb-3">{t.tourist_desc}</p>
              <div className="space-y-1">
                <p className="text-[9px] font-medium flex items-center gap-2">✅ {t.tourist_benefit_events}</p>
                <p className="text-[9px] font-medium flex items-center gap-2">✅ {t.tourist_setup_minimal}</p>
              </div>
            </div>
          </div>
          <Button variant="outline" className="w-full mt-4 py-2 text-[10px] font-bold tracking-widest">{t.select_tourist}</Button>
        </Card>

        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 mt-4">
          <p className="text-[10px] font-medium text-amber-800 leading-relaxed">
            {t.change_later_info}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function DetailsScreen({ onBack, onNext, language, tier, initialData }: { onBack: () => void; onNext: (d: any) => void; language: Language; tier: UserTier; initialData?: any }) {
  const t = translations[language];
  const isCitizen = tier === UserTier.CITIZEN || tier === UserTier.PR;
  
  const [form, setForm] = useState({ 
    firstName: initialData?.firstName || '', 
    lastName: initialData?.lastName || '', 
    email: initialData?.email || '', 
    phone: initialData?.phone || '', 
    nationality: initialData?.nationality || t.nat_scottish, 
    dob: initialData?.dob || '', 
    password: initialData?.password || '', 
    confirmPassword: initialData?.password || '',
    lennoxPassId: initialData?.lennoxPassId || '',
    placeOfBirth: initialData?.placeOfBirth || '',
    occupation: initialData?.occupation || '',
    lhdbUnit: initialData?.lhdbUnit || ''
  });

  const isValid = isCitizen 
    ? (form.firstName && form.lastName && form.dob) 
    : (form.firstName && form.lastName && form.email && form.password && form.password === form.confirmPassword && form.dob);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}
      className="p-8 flex flex-col h-full"
    >
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="p-2 hover:bg-[#141414]/5 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h2 className="text-xl font-bold tracking-tight">{isCitizen ? t.citizen_details_title : t.create_account}</h2>
          <p className="text-[10px] font-bold text-[#141414]/40 uppercase tracking-widest">
            {isCitizen ? t.citizen_step_1 : (tier === UserTier.TOURIST ? t.step_1_of_2_tourist : t.step_1_of_4_details)}
          </p>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto pr-2 scrollbar-hide">
        <div className="h-1 bg-[#141414]/10 rounded-full w-full overflow-hidden">
          <div className="h-full bg-[#141414]" style={{ width: isCitizen ? '50%' : (tier === UserTier.TOURIST ? '50%' : '25%') }} />
        </div>

        {isCitizen && (
          <div className="bg-[#141414]/5 p-4 rounded-2xl mb-4">
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-2">{t.lhdb_identity_verified}</p>
            <p className="text-xs font-medium">{t.lhdb_prefill_info}</p>
          </div>
        )}

        {isCitizen && <Input label={t.lennoxpass_id} placeholder="LX-XXX-XXX-XX" value={form.lennoxPassId} onChange={e => setForm({...form, lennoxPassId: e.target.value})} />}
        <Input label={t.first_name} placeholder={t.first_name_placeholder} value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} />
        <Input label={t.last_name} placeholder={t.last_name_placeholder} value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} />
        
        {isCitizen && <Input label={t.place_of_birth} placeholder={t.pob_placeholder} value={form.placeOfBirth} onChange={e => setForm({...form, placeOfBirth: e.target.value})} />}
        
        {!isCitizen && (
          <>
            <Input label={t.email_address} type="email" placeholder={t.email_placeholder} value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
            <Input label={t.phone_mobile} placeholder={t.phone_placeholder} value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
            <p className="text-[10px] text-[#141414]/40 italic -mt-2">({t.verification_sms})</p>
          </>
        )}
        
        {!isCitizen && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-[#141414]/60">{t.nationality}</label>
            <select className="px-4 py-3 rounded-xl border border-[#141414]/10 bg-white outline-none" value={form.nationality} onChange={e => setForm({...form, nationality: e.target.value})}>
              <option>{t.nat_scottish}</option>
              <option>{t.nat_english}</option>
              <option>{t.nat_irish}</option>
              <option>{t.nat_american}</option>
              <option>{t.nat_other}</option>
            </select>
          </div>
        )}

        <Input label={t.dob} type="date" value={form.dob} onChange={e => setForm({...form, dob: e.target.value})} />
        
        {isCitizen && (
          <>
            <Input label={t.occupation} value={form.occupation} onChange={e => setForm({...form, occupation: e.target.value})} />
            <Input label={t.lhdb_unit} value={form.lhdbUnit} onChange={e => setForm({...form, lhdbUnit: e.target.value})} />
          </>
        )}

        {!isCitizen && (
          <>
            <Input label={t.password} type="password" placeholder="••••••••••••" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
            <Input label={t.confirm_password} type="password" placeholder="••••••••••••" value={form.confirmPassword} onChange={e => setForm({...form, confirmPassword: e.target.value})} />
          </>
        )}
      </div>

      <Button disabled={!isValid} className="w-full mt-8" onClick={() => onNext(form)}>
        {t.continue}
      </Button>
    </motion.div>
  );
}

function SMSScreen({ onBack, onNext, language }: { onBack: () => void; onNext: () => void; language: Language }) {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const refs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
  const t = translations[language];

  const handleChange = (idx: number, val: string) => {
    if (val.length > 1) val = val[val.length - 1];
    const newCode = [...code];
    newCode[idx] = val;
    setCode(newCode);
    if (val && idx < 5) refs[idx + 1].current?.focus();
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}
      className="p-8 flex flex-col h-full"
    >
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-2 hover:bg-[#141414]/5 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-bold tracking-tight">{t.verify_phone}</h2>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center text-center gap-8">
        <div>
          <p className="text-[#141414]/60 mb-1">{t.sent_code}</p>
          <p className="font-bold">+44 7700 900456</p>
        </div>

        <div className="flex gap-2">
          {code.map((c, i) => (
            <input
              key={i}
              ref={refs[i]}
              type="text"
              value={c}
              onChange={e => handleChange(i, e.target.value)}
              className="w-10 h-14 border-2 border-[#141414]/10 rounded-xl text-center text-xl font-bold focus:border-[#141414] outline-none"
            />
          ))}
        </div>

        <div className="space-y-2">
          <p className="text-xs text-[#141414]/40">{t.didnt_receive} <span className="text-[#141414] font-bold">{t.resend_code}</span> ({t.available_in} 58s)</p>
          <button className="text-xs font-bold underline">{t.wrong_number_change}</button>
        </div>
      </div>

      <Button className="w-full mt-8" onClick={onNext}>
        {t.verify}
      </Button>
    </motion.div>
  );
}

function WorkDetailsScreen({ onBack, onNext, language }: { onBack: () => void; onNext: (d: any) => void; language: Language }) {
  const t = translations[language];
  const [form, setForm] = useState({ workplace: t.lennox_shipyards, nearestHub: t.dumbarton_hub, commuteType: [t.commute_rail], driving: 'occasionally', plate: 'SG19 XYZ' });

  return (
    <motion.div 
      initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}
      className="p-8 flex flex-col h-full"
    >
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="p-2 hover:bg-[#141414]/5 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h2 className="text-xl font-bold tracking-tight">{t.work_details}</h2>
          <p className="text-[10px] font-bold text-[#141414]/40 uppercase tracking-widest">{t.step_2_of_3}</p>
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto pr-2 scrollbar-hide">
        <div className="h-1 bg-[#141414]/10 rounded-full w-full overflow-hidden">
          <div className="h-full bg-[#141414] w-2/3" />
        </div>

        <p className="text-sm text-[#141414]/60">{t.personalize_exp}</p>

        <Input label={t.where_work} value={form.workplace} onChange={e => setForm({...form, workplace: e.target.value})} />
        
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-[#141414]/60">{t.nearest_hub_work}</label>
          <select className="px-4 py-3 rounded-xl border border-[#141414]/10 bg-white outline-none" value={form.nearestHub} onChange={e => setForm({...form, nearestHub: e.target.value})}>
            <option>{t.dumbarton_hub}</option>
            <option>{t.lennox_central_hub}</option>
            <option>{t.west_end_hub}</option>
          </select>
        </div>

        <div className="space-y-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-[#141414]/60">{t.how_commute}</label>
          {[t.commute_rail, t.commute_metro, t.commute_drive, t.commute_ferry].map(c => (
            <label key={c} className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.commuteType.includes(c)} onChange={e => {
                const newC = e.target.checked ? [...form.commuteType, c] : form.commuteType.filter(x => x !== c);
                setForm({...form, commuteType: newC});
              }} className="w-5 h-5 accent-[#141414]" />
              <span className="text-sm font-medium">{c}</span>
            </label>
          ))}
        </div>

        <div className="space-y-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-[#141414]/60">{t.drive_into_lennox}</label>
          {[
            { id: 'regularly', label: t.drive_regularly },
            { id: 'occasionally', label: t.drive_occasionally },
            { id: 'no', label: t.drive_no }
          ].map(opt => (
            <label key={opt.id} className="flex items-center gap-3 cursor-pointer">
              <input type="radio" checked={form.driving === opt.id} onChange={() => setForm({...form, driving: opt.id})} className="w-5 h-5 accent-[#141414]" />
              <span className="text-sm font-medium">{opt.label}</span>
            </label>
          ))}
        </div>

        {form.driving !== 'no' && (
          <Input label={t.vehicle_reg} placeholder="SG19 XYZ" value={form.plate} onChange={e => setForm({...form, plate: e.target.value})} />
        )}
      </div>

      <Button className="w-full mt-8" onClick={() => onNext(form)}>
        {t.continue}
      </Button>
    </motion.div>
  );
}

function PermissionsScreen({ onBack, onNext, language, tier }: { onBack: () => void; onNext: (d: any) => void; language: Language; tier: UserTier }) {
  const [loc, setLoc] = useState(true);
  const [notif, setNotif] = useState(true);
  const [agree, setAgree] = useState(false);
  const t = translations[language];

  return (
    <motion.div 
      initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}
      className="p-8 flex flex-col h-full"
    >
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="p-2 hover:bg-[#141414]/5 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h2 className="text-xl font-bold tracking-tight">{t.enable_features}</h2>
          <p className="text-[10px] font-bold text-[#141414]/40 uppercase tracking-widest">{t.step_3_of_3}</p>
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto pr-2 scrollbar-hide">
        <div className="h-1 bg-[#141414]/10 rounded-full w-full overflow-hidden">
          <div className="h-full bg-[#141414] w-full" />
        </div>

        <div className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="font-bold flex items-center gap-2"><MapPin className="w-4 h-4" /> {t.location_services}</p>
              <p className="text-xs text-[#141414]/60">{t.location_desc}</p>
            </div>
            <button onClick={() => setLoc(!loc)} className={cn("w-12 h-6 rounded-full transition-colors relative", loc ? 'bg-[#141414]' : 'bg-[#141414]/10')}>
              <div className={cn("absolute top-1 w-4 h-4 rounded-full bg-white transition-all", loc ? 'left-7' : 'left-1')} />
            </button>
          </div>

          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="font-bold flex items-center gap-2"><Bell className="w-4 h-4" /> {t.notifications}</p>
              <p className="text-xs text-[#141414]/60">{t.notifications_desc}</p>
            </div>
            <button onClick={() => setNotif(!notif)} className={cn("w-12 h-6 rounded-full transition-colors relative", notif ? 'bg-[#141414]' : 'bg-[#141414]/10')}>
              <div className={cn("absolute top-1 w-4 h-4 rounded-full bg-white transition-all", notif ? 'left-7' : 'left-1')} />
            </button>
          </div>

          <Button variant="outline" className="w-full justify-start gap-3">
            <CreditCard className="w-5 h-5" /> {t.save_payment}
          </Button>
        </div>

        <div className="bg-[#141414]/5 p-4 rounded-2xl space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">{t.features_available}</p>
          <div className="grid grid-cols-1 gap-2 text-xs font-medium">
            <p className="flex items-center gap-2 text-emerald-600">✅ {t.transport_payments}</p>
            <p className="flex items-center gap-2 text-emerald-600">✅ {t.hub_directory}</p>
            <p className="flex items-center gap-2 text-emerald-600">✅ {t.metro_planner}</p>
            <p className="flex items-center gap-2 text-emerald-600">✅ {t.ai_chatbot}</p>
            <p className="flex items-center gap-2 text-red-600 opacity-50">❌ {t.housing_requires_pr}</p>
            <p className="flex items-center gap-2 text-red-600 opacity-50">❌ {t.healthcare_requires_pr}</p>
          </div>
        </div>

        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} className="w-5 h-5 mt-1 accent-[#141414]" />
          <span className="text-xs font-medium text-[#141414]/60">{t.agree_terms}</span>
        </label>
      </div>

      <Button disabled={!agree} className="w-full mt-8" onClick={() => onNext({})}>
        {t.create_account_btn}
      </Button>
    </motion.div>
  );
}

function SuccessScreen({ profile, onNext, language }: { profile: UserProfile; onNext: () => void; language: Language }) {
  const t = translations[language];
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
      className="p-8 flex flex-col h-full items-center justify-center text-center"
    >
      <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center text-white mb-6">
        <Check className="w-10 h-10" />
      </div>
      <h2 className="text-3xl font-bold tracking-tighter mb-2">✅ {t.success_welcome}</h2>
      <p className="text-lg font-medium mb-8">{t.account_ready}, {profile.firstName}</p>

      <div className="w-full space-y-4 mb-12">
        <div className="h-px bg-[#141414]/10 w-full" />
        <div className="space-y-2 text-left">
          <div className="flex justify-between text-sm">
            <span className="text-[#141414]/40">{t.account_type}</span>
            <span className="font-bold">
              {profile.tier === UserTier.CITIZEN ? t.citizen_account_type : 
               profile.tier === UserTier.PR ? t.pr_account_type : 
               profile.tier === UserTier.WORKER ? t.worker_account_type : 
               t.tourist_account_type}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#141414]/40">{t.work_location}</span>
            <span className="font-bold">{profile.workplace}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[#141414]/40">{t.nearest_hub}</span>
            <span className="font-bold">{profile.nearestHub}</span>
          </div>
        </div>
        <div className="h-px bg-[#141414]/10 w-full" />
      </div>

      <div className="w-full space-y-4">
        <Card className="text-left p-4">
          <p className="font-bold flex items-center gap-2 mb-1"><CreditCard className="w-4 h-4" /> {t.add_payment_card}</p>
          <p className="text-xs text-[#141414]/60 mb-3">{t.add_card_desc}</p>
          <div className="flex gap-2">
            <Button className="flex-1 py-2 text-xs">{t.add_card_now}</Button>
            <Button variant="ghost" className="flex-1 py-2 text-xs">{t.skip}</Button>
          </div>
        </Card>

        <Card className="text-left p-4">
          <p className="font-bold flex items-center gap-2 mb-1"><Zap className="w-4 h-4" /> {t.enable_autopay}</p>
          <p className="text-xs text-[#141414]/60 mb-3">{t.autopay_desc}</p>
          <div className="flex gap-2">
            <Button className="flex-1 py-2 text-xs">{t.enable_autopay}</Button>
            <Button variant="ghost" className="flex-1 py-2 text-xs">{t.not_now}</Button>
          </div>
        </Card>
      </div>

      <Button className="w-full mt-12" onClick={onNext}>
        {t.start_exploring}
      </Button>
    </motion.div>
  );
}

// --- Dashboard & Tabs ---

function Dashboard({ 
  profile, 
  isGuest,
  vehicles, 
  payments, 
  bankAccounts, 
  bankTransactions,
  housingApplications, 
  prApplications, 
  setHousingApplications, 
  setPrApplications, 
  activeTab, 
  setActiveTab, 
  language, 
  setLanguage,
  isDemo,
  setIsDemo,
  setProfile,
  setScreen 
}: { 
  profile: UserProfile; 
  isGuest: boolean;
  vehicles: Vehicle[]; 
  payments: PaymentRecord[]; 
  bankAccounts: BankAccount[];
  bankTransactions: BankTransaction[];
  housingApplications: HousingApplication[];
  prApplications: PRApplication[];
  setHousingApplications: React.Dispatch<React.SetStateAction<HousingApplication[]>>;
  setPrApplications: React.Dispatch<React.SetStateAction<PRApplication[]>>;
  activeTab: string; 
  setActiveTab: (t: any) => void; 
  language: Language; 
  setLanguage: (l: Language) => void; 
  isDemo: boolean; 
  setIsDemo: (b: boolean) => void; 
  setProfile: (p: any) => void; 
  setScreen: (s: any) => void 
}) {
  const t = translations[language];
  return (
    <div className="flex flex-col h-full bg-[#F5F5F4]">
      {/* Header */}
      <header className="bg-white px-6 py-4 flex items-center justify-between border-b border-[#141414]/5 sticky top-0 z-10">
        <h1 className="text-xl font-bold tracking-tighter">{APP_NAME}</h1>
        <div className="flex items-center gap-3">
          <button className="p-2 hover:bg-[#141414]/5 rounded-full relative">
            <Bell className="w-5 h-5" />
            <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
          </button>
          <button className="p-2 hover:bg-[#141414]/5 rounded-full">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-24">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && <HomeTab profile={profile} vehicles={vehicles} payments={payments} onTabChange={setActiveTab} language={language} />}
          {activeTab === 'transport' && <TransportTab profile={profile} vehicles={vehicles} payments={payments} language={language} />}
          {activeTab === 'hub' && <HubTab language={language} />}
          {activeTab === 'assistant' && <AssistantTab profile={profile} language={language} />}
          {activeTab === 'more' && <MoreTab profile={profile} prApplications={prApplications} setPrApplications={setPrApplications} language={language} setLanguage={setLanguage} isDemo={isDemo} setIsDemo={setIsDemo} setProfile={setProfile} setScreen={setScreen} />}
          {activeTab === 'housing' && <HousingTab profile={profile} housingApplications={housingApplications} setHousingApplications={setHousingApplications} isDemo={isDemo} language={language} />}
          {activeTab === 'health' && <HealthTab profile={profile} language={language} />}
          {activeTab === 'banking' && <BankingTab profile={profile} bankAccounts={bankAccounts} bankTransactions={bankTransactions} language={language} />}
        </AnimatePresence>
      </main>

      {/* Bottom Nav */}
      <nav className="bg-white border-t border-[#141414]/5 px-4 py-3 flex items-center justify-around fixed bottom-0 w-full max-w-md">
        <NavButton active={activeTab === 'home'} icon={<Home className="w-5 h-5" />} label={t.home} onClick={() => setActiveTab('home')} />
        
        {(profile.tier === UserTier.CITIZEN || profile.tier === UserTier.PR) ? (
          <>
            <NavButton active={activeTab === 'housing'} icon={<Building2 className="w-5 h-5" />} label={t.housing} onClick={() => setActiveTab('housing')} />
            <NavButton active={activeTab === 'banking'} icon={<CreditCard className="w-5 h-5" />} label={t.banking} onClick={() => setActiveTab('banking')} />
            <NavButton active={activeTab === 'health'} icon={<Heart className="w-5 h-5" />} label={t.health} onClick={() => setActiveTab('health')} />
          </>
        ) : (
          <>
            <NavButton active={activeTab === 'hub'} icon={<MapPin className="w-5 h-5" />} label={t.hub} onClick={() => setActiveTab('hub')} />
            <NavButton active={activeTab === 'assistant'} icon={<Bot className="w-5 h-5" />} label={t.assistant} onClick={() => setActiveTab('assistant')} />
          </>
        )}
        
        <NavButton active={activeTab === 'transport'} icon={<Car className="w-5 h-5" />} label={t.transport} onClick={() => setActiveTab('transport')} />
        <NavButton active={activeTab === 'more'} icon={<MoreHorizontal className="w-5 h-5" />} label={t.more} onClick={() => setActiveTab('more')} />
      </nav>
    </div>
  );
}

function NavButton({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn("flex flex-col items-center gap-1 transition-all", active ? 'text-[#141414]' : 'text-[#141414]/40')}>
      {icon}
      <span className="text-[10px] font-bold uppercase tracking-tighter">{label}</span>
    </button>
  );
}

function HomeTab({ profile, vehicles, payments, onTabChange, language }: { 
  profile: UserProfile; 
  vehicles: Vehicle[]; 
  payments: PaymentRecord[]; 
  onTabChange: (tab: any) => void;
  language: Language;
}) {
  const isCitizen = profile.tier === UserTier.CITIZEN || profile.tier === UserTier.PR;
  const t = translations[language];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6 space-y-6">
      <Card className="bg-[#141414] text-white border-none">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-lg font-bold">👋 {t.hi} {profile.firstName}!</p>
            <p className="text-xs opacity-60">{new Date().toLocaleDateString(language === 'gd' ? 'gd-GB' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} • 14:32</p>
          </div>
          <Badge className="bg-white/10 text-white">
            {profile.tier === UserTier.CITIZEN ? t.citizen_account_type : 
             profile.tier === UserTier.PR ? t.pr_account_type : 
             profile.tier === UserTier.WORKER ? t.worker_account_type : 
             t.tourist_account_type}
          </Badge>
        </div>
      </Card>

      {isCitizen ? (
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4 border-emerald-100 bg-emerald-50/30 cursor-pointer" onClick={() => onTabChange('housing')}>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-2">{t.housing}</p>
            <p className="font-bold text-sm">{t.lhdb_apartment}</p>
            <p className="text-xs text-emerald-600 font-medium">{t.rent_paid_march}</p>
          </Card>
          <Card className="p-4 border-blue-100 bg-blue-50/30 cursor-pointer" onClick={() => onTabChange('health')}>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-2">{t.health}</p>
            <p className="font-bold text-sm">{t.lhs_status}</p>
            <p className="text-xs text-blue-600 font-medium">{t.fully_covered}</p>
          </Card>
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest opacity-40 flex items-center gap-2">
            <AlertCircle className="w-3 h-3" /> {t.alerts} (2)
          </h3>
          
          <Card className="border-amber-200 bg-amber-50/50">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-amber-100 rounded-xl text-amber-600">
                <Car className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <p className="font-bold">🚗 {t.congestion_charge}</p>
                <p className="text-xs text-[#141414]/60 mb-1">{t.vehicle_entered_today.replace('{plate}', 'SG19 XYZ').replace('{time}', '8:14 AM')}</p>
                <p className="text-xs font-bold">{t.amount}: {t.amount_with_gbp.replace('{lennox}', t.lennox_currency_amount.replace('{amount}', '25')).replace('{gbp}', t.gbp_currency_amount.replace('{amount}', '21'))}</p>
                <div className="flex gap-2 mt-3">
                  <Button className="py-2 px-4 text-xs bg-amber-600">{t.pay_now}</Button>
                  <Button variant="ghost" className="py-2 px-4 text-xs">{t.auto_pay_setup}</Button>
                </div>
              </div>
            </div>
          </Card>

          <Card className="border-red-200 bg-red-50/50">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-red-100 rounded-xl text-red-600">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <p className="font-bold">📋 {t.road_tax}</p>
                <p className="text-xs text-[#141414]/60 mb-1">{t.uk_road_tax_valid.replace('{plate}', 'SG19 XYZ').replace('{date}', '5 April 2025')}</p>
                <p className="text-xs font-bold text-red-600">{t.lennox_road_tax_not_purchased}</p>
                <Button className="w-full mt-3 py-2 text-xs bg-red-600">{t.buy_road_tax}</Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4">
        {isCitizen && <QuickAction icon={<Building2 />} label={t.housing} onClick={() => onTabChange('housing')} />}
        {isCitizen && <QuickAction icon={<Heart />} label={t.health} onClick={() => onTabChange('health')} />}
        <QuickAction icon={<Car />} label={t.transport} onClick={() => onTabChange('transport')} />
        <QuickAction icon={<MapPin />} label={t.hub} onClick={() => onTabChange('hub')} />
        <QuickAction icon={<Train />} label={t.metro} onClick={() => onTabChange('transport')} />
        <QuickAction icon={<Bot />} label={t.assistant} onClick={() => onTabChange('assistant')} />
        <QuickAction icon={<Calendar />} label={t.events} />
        <QuickAction icon={<Info />} label={t.tourist} />
      </div>

      <Card className="p-4">
        <h3 className="text-[10px] font-bold uppercase tracking-widest opacity-40 mb-3">{t.stats_title}</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>{isCitizen ? t.days_in_lennox : t.workdays_in_lennox}</span>
            <span className="font-bold">{isCitizen ? t.days_count.replace('{count}', '31').replace('{days}', t.days) : t.days_count.replace('{count}', '18').replace('{days}', t.days)}</span>
          </div>
          {!isCitizen && (
            <div className="flex justify-between">
              <span>{t.congestion_charges_paid}:</span>
              <span className="font-bold">{t.congestion_charges_paid_detail.replace('{amount}', '225').replace('{count}', '9').replace('{days}', t.days)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>{t.metro_journeys}</span>
            <span className="font-bold">{isCitizen ? t.metro_journeys_detail.replace('{count}', '42').replace('{free}', t.free) : '14'}</span>
          </div>
          {isCitizen && (
            <div className="flex justify-between">
              <span>{t.savings}</span>
              <span className="font-bold text-emerald-600">{t.lennox_currency_amount.replace('{amount}', '168')}</span>
            </div>
          )}
        </div>
      </Card>

      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest opacity-40">
        <div className="flex items-center gap-1"><Check className="w-3 h-3 text-emerald-500" /> {t.metro_status}</div>
        <div className="flex items-center gap-1"><Cloud className="w-3 h-3" /> {t.temp_cloudy.replace('{temp}', '12').replace('{condition}', t.cloudy)}</div>
      </div>
    </motion.div>
  );
}

function QuickAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2" onClick={onClick}>
      <div className="w-12 h-12 bg-white border border-[#141414]/5 rounded-xl flex items-center justify-center text-[#141414] shadow-sm hover:border-[#141414] transition-all cursor-pointer">
        {icon}
      </div>
      <span className="text-[9px] font-bold uppercase tracking-tighter text-center">{label}</span>
    </div>
  );
}

function TransportTab({ profile, vehicles, payments, language }: { profile: UserProfile; vehicles: Vehicle[]; payments: PaymentRecord[]; language: Language }) {
  const isCitizen = profile.tier === UserTier.CITIZEN || profile.tier === UserTier.PR;
  const t = translations[language];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6 space-y-6">
      <h2 className="text-2xl font-bold tracking-tighter">{t.transport}</h2>

      {isCitizen && (
        <Card className="bg-[#141414] text-white border-none p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
              <Train className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold">{t.digital_metro_pass}</p>
              <p className="text-xs opacity-60">{t.citizen_pr_benefit}</p>
            </div>
          </div>
          <div className="bg-white/10 p-4 rounded-2xl text-center">
            <p className="text-2xl font-bold tracking-tighter">{t.free_travel}</p>
            <p className="text-[10px] uppercase tracking-widest opacity-60">{t.unlimited_metro_bus}</p>
          </div>
        </Card>
      )}

      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-widest opacity-40">{t.your_vehicles}</h3>
        {vehicles.length > 0 ? (
          vehicles.map(v => (
            <Card key={v.id} className="p-5">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-lg font-bold">🚗 {v.plate}</p>
                  <p className="text-xs text-[#141414]/60">{v.make} {v.model}, {v.color}</p>
                </div>
                {v.plate === 'SG19 XYZ' && <Badge variant="warning">{t.action_needed}</Badge>}
              </div>
              
              <div className="space-y-4">
                <div className="bg-[#141414]/5 p-3 rounded-xl space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">{t.status_today}</p>
                  <p className="text-sm font-medium">⚠️ {t.entered_lennox} 8:14 AM</p>
                  <p className="text-xs text-[#141414]/60">📍 {t.last_seen} {t.bowling_border}</p>
                </div>

                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs font-bold">{t.congestion_charge}</p>
                    <p className="text-[10px] text-red-500 font-bold uppercase">⚠️ {t.unpaid_due}</p>
                  </div>
                  <Button className="py-2 px-4 text-xs">{t.lennox_currency_amount.replace('{amount}', '25')} {t.pay_now}</Button>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <Card className="p-5 text-center">
            <p className="text-sm text-[#141414]/60">{t.no_vehicles}</p>
          </Card>
        )}
        <Button variant="outline" className="w-full border-dashed">+ {t.add_another_vehicle}</Button>
      </div>

      {!isCitizen && (
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest opacity-40">{t.metro_worker_pass}</h3>
          <Card className="p-4 space-y-3">
            <p className="text-xs text-[#141414]/60 italic">{t.no_pass_not_free}</p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="text-xs py-2">{t.single}: {t.lennox_currency.replace('{amount}', '2-6')}</Button>
              <Button variant="outline" className="text-xs py-2">{t.day_pass}: {t.lennox_currency.replace('{amount}', '8')}</Button>
              <Button variant="outline" className="text-xs py-2">{t.weekly}: {t.lennox_currency.replace('{amount}', '40')}</Button>
              <Button variant="outline" className="text-xs py-2">{t.monthly}: {t.lennox_currency.replace('{amount}', '120')}</Button>
            </div>
            <Button className="w-full">{t.buy_metro_ticket}</Button>
          </Card>
        </div>
      )}

      <Card className="bg-emerald-50 border-emerald-100">
        <p className="font-bold text-emerald-900 flex items-center gap-2"><MapPin className="w-4 h-4" /> {t.park_and_ride}</p>
        <p className="text-xs text-emerald-800/60 mb-3">{t.nearest_p_r}</p>
        <ul className="text-xs text-emerald-900 space-y-1 mb-4">
          <li>• {t.free_parking}</li>
          <li>• {t.metro_to_dumbarton}</li>
          <li>• {t.avoids_congestion}</li>
        </ul>
        <Button className="w-full bg-emerald-600">{t.directions_to_bowling}</Button>
      </Card>
    </motion.div>
  );
}

function HubTab({ language }: { language: Language }) {
  const [search, setSearch] = useState('');
  const t = translations[language];
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6 space-y-6">
      <h2 className="text-2xl font-bold tracking-tighter">{t.hub_directory}</h2>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#141414]/40" />
        <input 
          type="text" 
          placeholder={t.search_placeholder} 
          className="w-full pl-12 pr-4 py-3 rounded-2xl border border-[#141414]/10 bg-white outline-none focus:border-[#141414]"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-widest opacity-40">{t.nearby_hubs}</h3>
        <Card className="p-0 overflow-hidden">
          <img src="https://picsum.photos/seed/hub/400/200" className="w-full h-32 object-cover" alt="Hub" referrerPolicy="no-referrer" />
          <div className="p-4">
            <div className="flex justify-between items-center mb-1">
              <p className="font-bold text-lg">{t.dumbarton_hub}</p>
              <Badge variant="success">{t.open}</Badge>
            </div>
            <p className="text-xs text-[#141414]/60 mb-4">{t.hub_distance_desc}</p>
            <div className="flex gap-2">
              <Button className="flex-1 text-xs py-2">{t.hub}</Button>
              <Button variant="outline" className="flex-1 text-xs py-2">{t.floor_plan}</Button>
            </div>
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-widest opacity-40">{t.popular_near_work}</h3>
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          <HubItem name={t.container_cafe} type={t.coffee_food} img="coffee" />
          <HubItem name={t.tesco_express} type={t.groceries} img="shop" />
          <HubItem name={t.caseys_bar} type={t.pub_grill} img="food" />
        </div>
      </div>
    </motion.div>
  );
}

function HubItem({ name, type, img }: { name: string; type: string; img: string }) {
  return (
    <div className="min-w-[140px] space-y-2">
      <img src={`https://picsum.photos/seed/${img}/200/200`} className="w-full aspect-square rounded-2xl object-cover" alt={name} referrerPolicy="no-referrer" />
      <div>
        <p className="font-bold text-sm leading-tight">{name}</p>
        <p className="text-[10px] text-[#141414]/60">{type}</p>
      </div>
    </div>
  );
}

function AssistantTab({ profile, language }: { profile: UserProfile; language: Language }) {
  const isCitizen = profile.tier === UserTier.CITIZEN || profile.tier === UserTier.PR;
  const t = translations[language];
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    { role: 'assistant', content: t.assistant_greeting.replace('{name}', profile.firstName) }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsTyping(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const model = ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          { role: 'user', parts: [{ text: userMsg }] }
        ],
        config: {
          systemInstruction: `You are the MyLennox AI Assistant. You are helping a user with a "${profile.tier === UserTier.CITIZEN ? 'Citizen' : profile.tier === UserTier.PR ? 'PR' : 'Worker'}" account.
          User Profile: ${JSON.stringify(profile)}
          
          Current language preference: ${language === 'gd' ? 'Gaelic (Gàidhlig)' : 'English'}.
          PLEASE RESPOND IN ${language === 'gd' ? 'GAELIC (GÀIDHLIG)' : 'ENGLISH'}.

          RULES:
          1. Be helpful, professional, and concise.
          2. For transport queries, provide accurate info.
          3. For Hub directory queries, suggest shops/restaurants.
          4. HOUSING/HEALTH: 
             - If Citizen/PR: Provide full help with LHDB housing and LHS healthcare.
             - If Worker/Visitor: 
               - For Housing: "LHDB housing is only for Lennoxian citizens and PRs. You're currently a worker/visitor. If you receive PR in the future, you can upgrade your account."
               - For Health: "LHS is only for Lennoxian citizens and PRs. As a visitor, you can access walk-in GP clinics (L$50 consultation)."
          5. Mention the PR pathway (4 years work = PR eligible) if relevant for workers.
          6. Use Markdown for formatting.`
        }
      });

      const response = await model;
      setMessages(prev => [...prev, { role: 'assistant', content: response.text || t.error_processing }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: t.error_connecting }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col h-full bg-white">
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={cn("flex", m.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div className={cn("max-w-[85%] p-4 rounded-2xl text-sm", m.role === 'user' ? 'bg-[#141414] text-white rounded-tr-none' : 'bg-[#141414]/5 text-[#141414] rounded-tl-none')}>
              <div className="prose prose-sm prose-invert max-w-none">
                <Markdown>{m.content}</Markdown>
              </div>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-[#141414]/5 p-4 rounded-2xl rounded-tl-none flex gap-1">
              <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-[#141414] rounded-full" />
              <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-[#141414] rounded-full" />
              <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-[#141414] rounded-full" />
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-[#141414]/5 flex gap-2 bg-white sticky bottom-0">
        <input 
          type="text" 
          placeholder={t.ask_anything} 
          className="flex-1 px-4 py-3 rounded-xl bg-[#141414]/5 outline-none focus:bg-[#141414]/10 transition-all"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
        />
        <Button className="px-4" onClick={handleSend} disabled={isTyping}>
          <Zap className="w-5 h-5" />
        </Button>
      </div>
    </motion.div>
  );
}

function MoreTab({ profile, prApplications, setPrApplications, language, setLanguage, isDemo, setIsDemo, setProfile, setScreen }: { profile: UserProfile; prApplications: PRApplication[]; setPrApplications: React.Dispatch<React.SetStateAction<PRApplication[]>>; language: Language; setLanguage: (l: Language) => void; isDemo: boolean; setIsDemo: (b: boolean) => void; setProfile: (p: any) => void; setScreen: (s: any) => void }) {
  const isCitizen = profile.tier === UserTier.CITIZEN || profile.tier === UserTier.PR;
  const t = translations[language];
  const [showPRApply, setShowPRApply] = useState(false);
  const [employerRef, setEmployerRef] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Calculate years of work
  const workStartDate = profile.workStartDate ? new Date(profile.workStartDate) : null;
  const yearsOfWork = workStartDate ? (new Date().getTime() - workStartDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25) : 0;
  const isEligibleForPR = profile.tier === UserTier.WORKER && yearsOfWork >= 4;

  const handlePRApply = async () => {
    setSubmitting(true);
    const app: PRApplication = {
      id: Math.random().toString(36).substr(2, 9),
      uid: profile.uid,
      status: 'pending',
      yearsOfWork: Math.floor(yearsOfWork),
      employerReference: employerRef,
      submissionDate: new Date().toISOString()
    };

    if (isDemo) {
      // In demo mode, just update local state
      setPrApplications(prev => [...prev, app]);
      setSubmitting(false);
      setShowPRApply(false);
      return;
    }

    try {
      await setDoc(doc(db, 'pr_applications', app.id), app);
      setShowPRApply(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `pr_applications/${app.id}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6 space-y-8 pb-24">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-[#141414] rounded-2xl flex items-center justify-center text-white text-2xl font-bold">
          {profile.firstName[0]}{profile.lastName[0]}
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight">{profile.firstName} {profile.lastName}</h2>
          <p className="text-xs text-[#141414]/60">{profile.email}</p>
          <Badge className="mt-1">
            {profile.tier === UserTier.CITIZEN ? t.citizen_account_type : 
             profile.tier === UserTier.PR ? t.pr_account_type : 
             profile.tier === UserTier.WORKER ? t.worker_account_type : 
             t.tourist_account_type}
          </Badge>
        </div>
      </div>

      {isEligibleForPR && prApplications.length === 0 && (
        <Card className="bg-emerald-600 text-white border-none p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Zap className="w-6 h-6" />
            <h3 className="font-bold">{t.eligible_for_pr}</h3>
          </div>
          <p className="text-xs opacity-90">{t.years_of_service.replace('{years}', Math.floor(yearsOfWork).toString())}</p>
          <Button variant="secondary" className="w-full" onClick={() => setShowPRApply(true)}>{t.apply_now}</Button>
        </Card>
      )}

      {prApplications.length > 0 && (
        <Card className="p-4 space-y-2">
          <h3 className="text-[10px] font-bold uppercase tracking-widest opacity-40">{t.pr_app_status}</h3>
          {prApplications.map(app => (
            <div key={app.id} className="flex justify-between items-center">
              <p className="text-sm font-bold">{t.review}</p>
              <Badge variant="default">{t[app.status]}</Badge>
            </div>
          ))}
        </Card>
      )}

      <Card className="p-4 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-widest opacity-40 px-2">{t.language}</h3>
        <div className="flex gap-2">
          <Button 
            variant={language === 'en' ? 'primary' : 'outline'} 
            className="flex-1 text-xs"
            onClick={() => setLanguage('en')}
          >
            {t.english}
          </Button>
          <Button 
            variant={language === 'gd' ? 'primary' : 'outline'} 
            className="flex-1 text-xs"
            onClick={() => setLanguage('gd')}
          >
            {t.gaelic}
          </Button>
        </div>
      </Card>

      {isCitizen ? (
        <Card className="bg-[#141414] text-white border-none p-6">
          <div className="flex items-center justify-between mb-6">
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">{t.digital_lennoxpass}</p>
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex flex-col items-center gap-4">
            <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center border-2 border-white/20">
              <Zap className="w-10 h-10 text-emerald-400" />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest">{t.nfc_ready}</p>
          </div>
        </Card>
      ) : (
        <Card className="bg-gradient-to-br from-[#141414] to-[#333] text-white border-none p-6">
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-2">💡 {t.upgrade_account}</p>
          <h3 className="text-lg font-bold mb-1">🎯 {t.apply_pr}</h3>
          <p className="text-xs opacity-80 mb-4">
            {yearsOfWork >= 4 
              ? t.eligible_now 
              : t.worked_years_eligible.replace('{years}', Math.floor(yearsOfWork).toString()).replace('{remaining}', Math.ceil(4 - yearsOfWork).toString())}
          </p>
          <div className="space-y-2 mb-6">
            <p className="text-[10px] flex items-center gap-2">✅ {t.housing_requires_pr}</p>
            <p className="text-[10px] flex items-center gap-2">✅ {t.free_travel}</p>
            <p className="text-[10px] flex items-center gap-2">✅ {t.healthcare_requires_pr}</p>
          </div>
          <Button variant="secondary" className="w-full text-xs py-2">{t.learn_about_pr}</Button>
        </Card>
      )}

      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-widest opacity-40 px-2">{t.payments_vehicles}</h3>
        <MoreItem icon={<CreditCard />} label={t.payment_methods} />
        <MoreItem icon={<Car />} label={t.vehicle_management} />
        <MoreItem icon={<History />} label={t.payment_history} />
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-widest opacity-40 px-2">{t.information}</h3>
        <MoreItem icon={<Info />} label={t.tourist_info} />
        <MoreItem icon={<ShoppingBag />} label={t.visitor_guide} />
        <MoreItem icon={<Cloud />} label={t.about_lennox} />
        {profile.tier === UserTier.CITIZEN && <MoreItem icon={<Vote />} label={t.voting_services} />}
      </div>

      <Button variant="ghost" className="w-full text-red-600 hover:bg-red-50" onClick={() => {
        if (isDemo) {
          setIsDemo(false);
          setProfile(null);
          setScreen('welcome');
        } else {
          signOut(auth);
        }
      }}>
        <LogOut className="w-5 h-5" /> {t.logout}
      </Button>

      <AnimatePresence>
        {showPRApply && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: 20 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/20 backdrop-blur-sm p-4"
          >
            <Card className="w-full max-w-md p-6 space-y-6 shadow-2xl">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold tracking-tight">{t.apply_pr}</h3>
                <Button variant="ghost" onClick={() => setShowPRApply(false)}><ArrowLeft className="w-5 h-5" /></Button>
              </div>
              
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                  <p className="text-xs text-emerald-800 font-medium">{t.eligibility_confirmed.replace('{years}', Math.floor(yearsOfWork).toString())}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">{t.employer_ref}</label>
                  <Input 
                    placeholder={t.employer_ref_placeholder} 
                    value={employerRef}
                    onChange={e => setEmployerRef(e.target.value)}
                  />
                </div>
              </div>

              <Button className="w-full" onClick={handlePRApply} disabled={submitting || !employerRef}>
                {submitting ? t.submitting : t.submit_application}
              </Button>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// --- New Citizen Tabs ---

function HousingTab({ profile, housingApplications, setHousingApplications, isDemo, language }: { profile: UserProfile; housingApplications: HousingApplication[]; setHousingApplications: React.Dispatch<React.SetStateAction<HousingApplication[]>>; isDemo: boolean; language: Language }) {
  const t = translations[language];
  const [showApply, setShowApply] = useState(false);
  const [propertyType, setPropertyType] = useState('Apartment');
  const [preferredHub, setPreferredHub] = useState('Lennox Central Hub');
  const [submitting, setSubmitting] = useState(false);

  const handleApply = async () => {
    setSubmitting(true);
    const app: HousingApplication = {
      id: Math.random().toString(36).substr(2, 9),
      uid: profile.uid,
      status: 'pending',
      propertyType,
      preferredHub,
      submissionDate: new Date().toISOString()
    };

    if (isDemo) {
      setHousingApplications(prev => [...prev, app]);
      setSubmitting(false);
      setShowApply(false);
      return;
    }

    try {
      await setDoc(doc(db, 'housing_applications', app.id), app);
      setShowApply(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `housing_applications/${app.id}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6 space-y-6 pb-24">
      <h2 className="text-2xl font-bold tracking-tighter">{t.housing_title}</h2>
      
      {profile.tier === UserTier.CITIZEN && (
        <Card className="p-6 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-lg font-bold">{t.apartment_unit.replace('{type}', t.apartment).replace('{unit}', '402')}</p>
              <p className="text-xs text-[#141414]/60">{t.lennox_heights}</p>
            </div>
            <Badge variant="success">{t.active_lease}</Badge>
          </div>
          <div className="h-px bg-[#141414]/5" />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">{t.monthly_rent}</p>
              <p className="font-bold">{t.lennox_currency.replace('{amount}', '850')}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">{t.next_due}</p>
              <p className="font-bold">{t.april_1}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button className="flex-1 py-2 text-xs">{t.report_maintenance}</Button>
            <Button variant="ghost" className="flex-1 py-2 text-xs">{t.view_lease}</Button>
          </div>
        </Card>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-xs font-bold uppercase tracking-widest opacity-40">{t.housing_app_status}</h3>
          <Button variant="ghost" className="text-[10px] h-auto py-1" onClick={() => setShowApply(true)}>{t.apply_housing}</Button>
        </div>
        
        {housingApplications.length === 0 && !showApply && (
          <p className="text-center py-8 text-xs text-[#141414]/40 italic">{t.no_active_applications}</p>
        )}

        {housingApplications.map(app => (
          <Card key={app.id} className="p-4 flex items-center justify-between">
            <div>
              <p className="font-bold text-sm">{app.propertyType} - {app.preferredHub}</p>
              <p className="text-[10px] opacity-60">{new Date(app.submissionDate).toLocaleDateString()}</p>
            </div>
            <Badge variant={app.status === 'approved' ? 'success' : app.status === 'denied' ? 'error' : 'default'}>
              {t[app.status]}
            </Badge>
          </Card>
        ))}
      </div>

      <AnimatePresence>
        {showApply && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: 20 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/20 backdrop-blur-sm p-4"
          >
            <Card className="w-full max-w-md p-6 space-y-6 shadow-2xl">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold tracking-tight">{t.apply_housing}</h3>
                <Button variant="ghost" onClick={() => setShowApply(false)}><ArrowLeft className="w-5 h-5" /></Button>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">{t.property_type}</label>
                  <select 
                    className="w-full p-3 rounded-xl bg-[#141414]/5 outline-none text-sm"
                    value={propertyType}
                    onChange={e => setPropertyType(e.target.value)}
                  >
                    <option value="Apartment">{t.apartment}</option>
                    <option value="Studio">{t.studio}</option>
                    <option value="Family Home">{t.family_home}</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-40">{t.preferred_hub_label}</label>
                  <select 
                    className="w-full p-3 rounded-xl bg-[#141414]/5 outline-none text-sm"
                    value={preferredHub}
                    onChange={e => setPreferredHub(e.target.value)}
                  >
                    <option value="Lennox Central Hub">{t.lennox_central_hub}</option>
                    <option value="West End Hub">{t.west_end_hub}</option>
                    <option value="Dumbarton Riverfront Hub">{t.dumbarton_hub}</option>
                  </select>
                </div>
              </div>

              <Button className="w-full" onClick={handleApply} disabled={submitting}>
                {submitting ? t.submitting : t.submit_application}
              </Button>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/**
 * Inline NFC scan step used inside the PR application flow (Step 2: Lennoxpass Scan).
 * Starts scanning immediately on mount and advances to the next step when a tag is read.
 * If the scanned ID matches expectedLennoxPassId it's a verified match; mismatches are
 * still accepted (LHDB will do the authoritative check server-side).
 */
function PRNFCScanStep({ onSuccess, expectedLennoxPassId }: { onSuccess: () => void; expectedLennoxPassId?: string }) {
  const [scanState, setScanState] = useState<'checking' | 'scanning' | 'not-supported' | 'disabled' | 'success' | 'error'>('checking');
  const [errorMsg, setErrorMsg] = useState('');
  const cleanupRef = useRef<(() => Promise<void>) | null>(null);

  const startScan = useCallback(async () => {
    setScanState('checking');
    setErrorMsg('');

    const supported = await NFCService.isSupported();
    if (!supported) { setScanState('not-supported'); return; }
    const enabled = await NFCService.isEnabled();
    if (!enabled) { setScanState('disabled'); return; }

    setScanState('scanning');
    const cleanup = await NFCService.startScanning(
      (_result) => {
        cleanupRef.current?.();
        cleanupRef.current = null;
        setScanState('success');
        setTimeout(onSuccess, 800);
      },
      (msg) => { setErrorMsg(msg); setScanState('error'); },
    );
    cleanupRef.current = cleanup;
  }, [onSuccess]);

  useEffect(() => {
    startScan();
    return () => { cleanupRef.current?.(); cleanupRef.current = null; };
  }, [startScan]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
      <div className="flex justify-between items-center px-2">
        <h3 className="font-bold">Step 2: Lennoxpass Scan</h3>
        <span className="text-xs font-bold opacity-40">2/4</span>
      </div>
      <Card className={cn(
        "p-6 flex flex-col items-center justify-center space-y-4 min-h-[300px]",
        scanState === 'success' ? "border-emerald-200 bg-emerald-50" :
        scanState === 'error' || scanState === 'not-supported' || scanState === 'disabled' ? "border-red-200 bg-red-50" :
        "border-blue-200 bg-blue-50"
      )}>
        {scanState === 'checking' && <Loader2 className="w-16 h-16 text-blue-400 animate-spin" />}
        {scanState === 'scanning' && <SmartphoneNfc className="w-16 h-16 text-blue-600 animate-pulse" />}
        {scanState === 'success' && <Check className="w-16 h-16 text-emerald-600" />}
        {(scanState === 'error' || scanState === 'not-supported' || scanState === 'disabled') && (
          <SmartphoneNfc className="w-16 h-16 text-red-400" />
        )}
        <p className={cn(
          "text-center font-bold",
          scanState === 'success' ? "text-emerald-900" :
          scanState === 'error' || scanState === 'not-supported' || scanState === 'disabled' ? "text-red-900" :
          "text-blue-900"
        )}>
          {scanState === 'checking' && 'Checking NFC...'}
          {scanState === 'scanning' && 'Hold your Lennoxpass near your phone'}
          {scanState === 'success' && 'Lennoxpass verified!'}
          {scanState === 'not-supported' && 'NFC not available on this device'}
          {scanState === 'disabled' && 'NFC is disabled — enable it in Settings'}
          {scanState === 'error' && 'Scan failed'}
        </p>
        <p className={cn(
          "text-xs text-center",
          scanState === 'success' ? "text-emerald-700/60" :
          scanState === 'error' || scanState === 'not-supported' || scanState === 'disabled' ? "text-red-700/60" :
          "text-blue-700/60"
        )}>
          {scanState === 'scanning' && 'We will read the NFC chip on your card.'}
          {scanState === 'not-supported' && 'Your device does not have NFC hardware.'}
          {scanState === 'disabled' && 'Please enable NFC in your device settings and try again.'}
          {scanState === 'error' && (errorMsg || 'Could not read the tag. Try holding it flat against the back of your phone.')}
        </p>
        {scanState === 'disabled' && (
          <Button className="bg-blue-600 hover:bg-blue-700 text-xs" onClick={() => NFCService.openSettings()}>
            Open Settings
          </Button>
        )}
      </Card>
      {(scanState === 'error' || scanState === 'not-supported' || scanState === 'disabled') && (
        <div className="space-y-3">
          {(scanState === 'error' || scanState === 'disabled') && (
            <Button className="w-full py-6 bg-blue-600 hover:bg-blue-700" onClick={startScan}>
              {scanState === 'disabled' ? 'Try Again (after enabling NFC)' : 'Try Again'}
            </Button>
          )}
          <Button variant="outline" className="w-full py-4 text-xs" onClick={onSuccess}>
            Skip NFC (continue without scan)
          </Button>
        </div>
      )}
    </div>
  );
}

function BankingTab({ profile, bankAccounts, bankTransactions, language }: { profile: UserProfile; bankAccounts: BankAccount[]; bankTransactions: BankTransaction[]; language: Language }) {
  const t = translations[language];
  const [creating, setCreating] = useState(false);
  const [showApplication, setShowApplication] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferAmount, setTransferAmount] = useState('');
  const [transferAccount, setTransferAccount] = useState('');
  const [transferFrom, setTransferFrom] = useState('');
  const [prStep, setPrStep] = useState(0);

  // Determine if user is citizen or PR
  const isCitizen = profile.tier === UserTier.CITIZEN;
  const isPR = profile.tier === UserTier.PR;

  const applyForAccount = async () => {
    setCreating(true);
    try {
      const accountId = Math.random().toString(36).substring(7);
      const newAccount: BankAccount = {
        id: accountId,
        uid: profile.uid,
        accountNumber: Math.floor(10000000 + Math.random() * 90000000).toString(),
        sortCode: 'LX-99-00',
        balance: 500.00, // Welcome bonus
        currency: 'L$',
        type: 'current',
        createdAt: new Date().toISOString(),
        status: isCitizen ? 'active' : 'pending' // PRs need manual review
      };
      await setDoc(doc(db, 'bank_accounts', accountId), newAccount);
      
      // If citizen, maybe also create a savings account automatically
      if (isCitizen) {
        const savingsId = Math.random().toString(36).substring(7);
        const savingsAccount: BankAccount = {
          id: savingsId,
          uid: profile.uid,
          accountNumber: Math.floor(10000000 + Math.random() * 90000000).toString(),
          sortCode: 'LX-99-00',
          balance: 0,
          currency: 'L$',
          type: 'savings',
          createdAt: new Date().toISOString(),
          status: 'active'
        };
        await setDoc(doc(db, 'bank_accounts', savingsId), savingsAccount);
      }
      
      setShowApplication(false);
      setPrStep(0);
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : 'Failed to create account');
    } finally {
      setCreating(false);
    }
  };

  const handleTransfer = async () => {
    if (!transferAmount || isNaN(Number(transferAmount)) || Number(transferAmount) <= 0) {
      alert("Please enter a valid amount.");
      return;
    }
    
    const sourceAccount = bankAccounts.find(a => a.id === transferFrom);
    if (!sourceAccount) return;
    
    if (sourceAccount.balance < Number(transferAmount)) {
      alert("Insufficient funds.");
      return;
    }
    
    setCreating(true);
    try {
      const amount = Number(transferAmount);
      
      // Update source account
      await setDoc(doc(db, 'bank_accounts', sourceAccount.id), {
        ...sourceAccount,
        balance: sourceAccount.balance - amount
      });
      
      // Create transaction record
      const txId = Math.random().toString(36).substring(7);
      const tx: BankTransaction = {
        id: txId,
        accountId: sourceAccount.id,
        uid: profile.uid,
        amount: amount,
        type: 'debit',
        description: `Transfer to ${transferAccount || 'External Account'}`,
        category: 'Transfer',
        date: new Date().toISOString(),
        status: 'completed'
      };
      await setDoc(doc(db, 'bank_transactions', txId), tx);
      
      setShowTransfer(false);
      setTransferAmount('');
      setTransferAccount('');
      alert("Transfer successful!");
    } catch (error) {
      console.error(error);
      alert("Transfer failed.");
    } finally {
      setCreating(false);
    }
  };

  // If user has accounts, show the dashboard
  if (bankAccounts.length > 0) {
    const hasPending = bankAccounts.some(acc => acc.status === 'pending');
    
    if (hasPending) {
      return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6 space-y-6 pb-24">
          <h2 className="text-2xl font-bold tracking-tighter">{t.banking}</h2>
          <Card className="p-6 text-center space-y-4 border-amber-500/30 bg-amber-500/5">
            <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="font-bold text-amber-700">{t.pending_approval || "Pending Approval"}</p>
              <p className="text-xs text-amber-700/70">{t.application_under_review || "Your application is currently under review."}</p>
            </div>
          </Card>
        </motion.div>
      );
    }

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6 space-y-6 pb-24">
        {showTransfer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <Card className="w-full max-w-md p-6 space-y-4">
              <h3 className="text-xl font-bold">Transfer Money</h3>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest opacity-60">From Account</label>
                <select 
                  className="w-full p-3 bg-[#141414]/5 rounded-xl border-none outline-none focus:ring-2 focus:ring-[#141414]/20"
                  value={transferFrom}
                  onChange={(e) => setTransferFrom(e.target.value)}
                >
                  {bankAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.type === 'current' ? 'Current' : 'Savings'} (****{acc.accountNumber.slice(-4)}) - L${acc.balance.toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest opacity-60">To Account Number</label>
                <Input 
                  placeholder="e.g. 12345678" 
                  value={transferAccount}
                  onChange={(e) => setTransferAccount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest opacity-60">Amount (L$)</label>
                <Input 
                  type="number" 
                  placeholder="0.00" 
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button variant="ghost" className="flex-1" onClick={() => setShowTransfer(false)}>Cancel</Button>
                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={handleTransfer} disabled={creating}>
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Transfer'}
                </Button>
              </div>
            </Card>
          </div>
        )}
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold tracking-tighter">{t.banking}</h2>
          <div className="flex gap-2">
            <Button variant="ghost" className="rounded-full w-8 h-8 p-0 bg-[#141414]/5">
              <Bell className="w-4 h-4" />
            </Button>
            <Button variant="ghost" className="rounded-full w-8 h-8 p-0 bg-[#141414]/5">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-emerald-700">
          <Landmark className="w-4 h-4" />
          <span className="font-bold text-sm">{t.lpb_title || "Lennox Postal Bank"}</span>
        </div>
        
        <div className="space-y-4">
          {bankAccounts.map(acc => (
            <Card key={acc.id} className="p-6 space-y-4 border-l-4 border-l-emerald-500">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-lg flex items-center gap-2">
                    {acc.type === 'current' ? '💵 ' : '💰 '}
                    {acc.type === 'current' ? t.current_account : t.savings_account}
                  </p>
                  <p className="text-xs opacity-60 tracking-widest font-mono mt-1">Account: ****{acc.accountNumber.slice(-4)}</p>
                  {acc.type === 'savings' && <p className="text-[10px] text-emerald-600 font-medium mt-1">2% interest</p>}
                </div>
                <p className="text-2xl font-bold text-[#141414]">
                  {acc.currency === 'L$' ? t.lennox_currency.replace('{amount}', acc.balance.toLocaleString()) : `£${acc.balance.toLocaleString()}`}
                </p>
              </div>
              <div className="flex gap-2 pt-2 border-t border-[#141414]/5">
                <Button variant="ghost" className="flex-1 py-2 text-xs h-auto">{t.view_all_transactions || "Transactions"}</Button>
                <Button variant="ghost" className="flex-1 py-2 text-xs h-auto" onClick={() => { setTransferFrom(acc.id); setShowTransfer(true); }}>{t.transfer}</Button>
                {acc.type === 'current' && <Button variant="ghost" className="flex-1 py-2 text-xs h-auto">{t.pay_bill}</Button>}
              </div>
            </Card>
          ))}
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-widest opacity-60 px-2">{t.recent_transactions || "Recent Transactions"}</h3>
          {bankTransactions.length > 0 ? (
            bankTransactions.slice(0, 5).map(tx => (
              <Card key={tx.id} className="p-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", tx.type === 'credit' ? "bg-emerald-100 text-emerald-600" : "bg-[#141414]/5 text-[#141414]")}>
                    {tx.type === 'credit' ? <ArrowRight className="w-5 h-5 rotate-90" /> : <ArrowRight className="w-5 h-5 -rotate-90" />}
                  </div>
                  <div>
                    <p className="font-bold text-sm">{tx.description}</p>
                    <p className="text-xs opacity-60">{tx.category}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn("font-bold", tx.type === 'credit' ? "text-emerald-600" : "text-[#141414]")}>
                    {tx.type === 'credit' ? '+' : '-'}L${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-[10px] opacity-60">
                    {new Date(tx.date).toLocaleDateString(language === 'gd' ? 'gd-GB' : 'en-GB', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
              </Card>
            ))
          ) : (
            <Card className="p-6 text-center text-sm opacity-60">
              No recent transactions.
            </Card>
          )}
          {bankTransactions.length > 5 && (
            <Button variant="ghost" className="w-full text-xs">{t.view_all_transactions || "VIEW ALL TRANSACTIONS"}</Button>
          )}
        </div>

        <Card className="p-6 bg-[#141414] text-white border-none">
          <h3 className="text-xs font-bold uppercase tracking-widest opacity-60 mb-4">{t.quick_actions}</h3>
          <div className="grid grid-cols-3 gap-3">
            <Button variant="secondary" className="text-xs py-4 flex flex-col gap-2 h-auto">
              <ArrowRight className="w-5 h-5" />
              {t.send_money || "Send"}
            </Button>
            <Button variant="secondary" className="text-xs py-4 flex flex-col gap-2 h-auto">
              <History className="w-5 h-5" />
              {t.statements}
            </Button>
            <Button variant="secondary" className="text-xs py-4 flex flex-col gap-2 h-auto">
              <CreditCard className="w-5 h-5" />
              {t.card_settings || "Cards"}
            </Button>
          </div>
        </Card>
      </motion.div>
    );
  }

  // If user is not a citizen or PR, they can't open an account
  if (!isCitizen && !isPR) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6 space-y-6 pb-24">
        <h2 className="text-2xl font-bold tracking-tighter">{t.banking}</h2>
        <Card className="p-6 text-center space-y-4">
          <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <p className="font-bold">Not Eligible</p>
            <p className="text-xs text-[#141414]/60 mt-2">
              Lennox Postal Bank accounts are currently only available to Lennoxian Citizens and Permanent Residents.
            </p>
          </div>
        </Card>
      </motion.div>
    );
  }

  // Show application flow if requested
  if (showApplication) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6 space-y-6 pb-24">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => { setShowApplication(false); setPrStep(0); }} className="rounded-full p-2 w-10 h-10">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-xl font-bold tracking-tighter">
            {isCitizen ? (t.identity_verification || "Identity Verification") : (t.kyc_verification || "KYC Verification")}
          </h2>
        </div>

        {isCitizen ? (
          <div className="space-y-6">
            <Card className="p-6 space-y-4 border-emerald-500/30 bg-emerald-500/5">
              <div className="flex items-center gap-3 text-emerald-700">
                <ScanFace className="w-6 h-6" />
                <p className="font-bold">{t.quick_selfie || "Quick selfie verification"}</p>
              </div>
              <p className="text-sm">{t.citizen_no_kyc || "As a Lennoxian citizen, you don't need full KYC. We just need to verify it's really you."}</p>
              <p className="text-sm">{t.compare_selfie || "We'll compare your selfie to your Lennoxpass photo."}</p>
            </Card>

            <div className="space-y-3 px-2">
              <h3 className="text-xs font-bold uppercase tracking-widest opacity-60">{t.instructions || "INSTRUCTIONS:"}</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> {t.inst_1 || "Find good lighting"}</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> {t.inst_2 || "Remove glasses/hat"}</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> {t.inst_3 || "Look directly at camera"}</li>
              </ul>
            </div>

            <Button 
              className="w-full py-6 text-sm font-bold bg-emerald-600 hover:bg-emerald-700" 
              onClick={applyForAccount} 
              disabled={creating}
            >
              {creating ? (
                <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> {t.verifying_identity || "Verifying..."}</span>
              ) : (
                <span className="flex items-center gap-2"><Camera className="w-4 h-4" /> {t.start_selfie || "START SELFIE VERIFICATION"}</span>
              )}
            </Button>
            <p className="text-xs text-center opacity-60">{t.selfie_privacy || "This takes 10 seconds. Your photo is encrypted."}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {prStep === 0 && (
              <>
                <Card className="p-6 space-y-4 border-blue-500/30 bg-blue-500/5">
                  <div className="flex items-center gap-3 text-blue-700">
                    <FileText className="w-6 h-6" />
                    <p className="font-bold">{t.kyc_legal_req || "Full Verification Required"}</p>
                  </div>
                  <p className="text-sm">{t.kyc_legal_desc || "Banking regulations require full identity verification for permanent residents."}</p>
                </Card>

                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest opacity-60 px-2">{t.what_you_need_time || "WHAT YOU'LL NEED (5-10 mins):"}</h3>
                  
                  <div className="space-y-3">
                    <div className="flex gap-3 items-start p-3 bg-white rounded-xl border border-[#141414]/10">
                      <ScanFace className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="font-bold text-sm">{t.step_1_liveness || "Step 1: Selfie + Liveness"}</p>
                        <p className="text-xs opacity-60">{t.step_1_desc || "Take selfie + blink, turn head"}</p>
                      </div>
                    </div>
                    <div className="flex gap-3 items-start p-3 bg-white rounded-xl border border-[#141414]/10">
                      <SmartphoneNfc className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="font-bold text-sm">{t.step_2_scan || "Step 2: Lennoxpass Scan"}</p>
                        <p className="text-xs opacity-60">{t.step_2_desc || "Scan both sides of your card"}</p>
                      </div>
                    </div>
                    <div className="flex gap-3 items-start p-3 bg-white rounded-xl border border-[#141414]/10">
                      <Home className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="font-bold text-sm">{t.step_3_address || "Step 3: Proof of Address"}</p>
                        <p className="text-xs opacity-60">{t.step_3_desc || "Auto-verified if LHDB resident"}</p>
                      </div>
                    </div>
                    <div className="flex gap-3 items-start p-3 bg-white rounded-xl border border-[#141414]/10">
                      <UploadCloud className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="font-bold text-sm">{t.step_4_funds || "Step 4: Source of Funds"}</p>
                        <p className="text-xs opacity-60">{t.step_4_desc || "Declare where your money comes from"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <Button 
                  className="w-full py-6 text-sm font-bold bg-blue-600 hover:bg-blue-700" 
                  onClick={() => setPrStep(1)} 
                >
                  {t.start_verification || "START VERIFICATION"}
                </Button>
                <p className="text-xs text-center opacity-60">{t.approval_time || "Approval: 24-48 hours (manual review)"}</p>
              </>
            )}

            {prStep === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                <div className="flex justify-between items-center px-2">
                  <h3 className="font-bold">Step 1: Liveness Check</h3>
                  <span className="text-xs font-bold opacity-40">1/4</span>
                </div>
                <Card className="p-6 flex flex-col items-center justify-center space-y-4 bg-[#141414] text-white border-none min-h-[300px]">
                  <ScanFace className="w-16 h-16 text-blue-400 animate-pulse" />
                  <p className="text-center font-bold">Position your face in the frame</p>
                  <p className="text-xs text-center opacity-60">Please blink slowly to verify liveness.</p>
                </Card>
                <Button className="w-full py-6 bg-blue-600 hover:bg-blue-700" onClick={() => setPrStep(2)}>
                  Simulate Success
                </Button>
              </div>
            )}

            {prStep === 2 && (
              <PRNFCScanStep onSuccess={() => setPrStep(3)} expectedLennoxPassId={profile?.lennoxPassId} />
            )}

            {prStep === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                <div className="flex justify-between items-center px-2">
                  <h3 className="font-bold">Step 3: Proof of Address</h3>
                  <span className="text-xs font-bold opacity-40">3/4</span>
                </div>
                <Card className="p-6 space-y-4 border-emerald-200 bg-emerald-50">
                  <div className="flex items-center gap-3 text-emerald-700">
                    <CheckCircle2 className="w-6 h-6" />
                    <p className="font-bold">Auto-Verified</p>
                  </div>
                  <p className="text-sm text-emerald-800/80">
                    We found your address in the LHDB registry. No document upload required.
                  </p>
                  <div className="p-3 bg-white rounded-lg border border-emerald-100 text-sm font-mono">
                    Apt 4B, 12 Lennox Way<br/>
                    Lennox City, LX 10001
                  </div>
                </Card>
                <Button className="w-full py-6 bg-blue-600 hover:bg-blue-700" onClick={() => setPrStep(4)}>
                  Continue
                </Button>
              </div>
            )}

            {prStep === 4 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                <div className="flex justify-between items-center px-2">
                  <h3 className="font-bold">Step 4: Source of Funds</h3>
                  <span className="text-xs font-bold opacity-40">4/4</span>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest opacity-60">Primary Source</label>
                    <select className="w-full p-3 bg-[#141414]/5 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-500/20">
                      <option>Salary / Employment</option>
                      <option>Business Income</option>
                      <option>Savings / Investments</option>
                      <option>Family Support</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest opacity-60">Employer / Business Name</label>
                    <Input placeholder="e.g. Lennox Marine" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest opacity-60">Expected Monthly Turnover (L$)</label>
                    <select className="w-full p-3 bg-[#141414]/5 rounded-xl border-none outline-none focus:ring-2 focus:ring-blue-500/20">
                      <option>0 - 5,000</option>
                      <option>5,000 - 15,000</option>
                      <option>15,000 - 50,000</option>
                      <option>50,000+</option>
                    </select>
                  </div>
                </div>
                <Button 
                  className="w-full py-6 text-sm font-bold bg-blue-600 hover:bg-blue-700" 
                  onClick={applyForAccount} 
                  disabled={creating}
                >
                  {creating ? (
                    <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</span>
                  ) : (
                    "SUBMIT APPLICATION"
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </motion.div>
    );
  }

  // Initial Empty State (Landing Page)
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-0 pb-24">
      <div className="bg-emerald-800 text-white p-6 pt-12 pb-8 rounded-b-[2rem] shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl"></div>
        <div className="relative z-10 space-y-4">
          <div className="flex justify-between items-start">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-emerald-800 shadow-md">
              <Landmark className="w-7 h-7" />
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" className="text-white hover:bg-white/20 rounded-full p-2 w-10 h-10">
                <Bell className="w-5 h-5" />
              </Button>
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight">{t.lpb_title || "LENNOX POSTAL BANK"}</h2>
            <p className="text-emerald-100/80 text-sm font-medium">{t.lpb_subtitle || "The official bank of the Republic of Lennox"}</p>
          </div>
          <div className="inline-flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-sm">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
            {t.lpb_stats || "Est. 1952 • Government-owned"}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6 -mt-4 relative z-20">
        <Card className="p-6 space-y-4 shadow-xl border-none">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckSquare className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-sm font-medium">{t.lpb_feature_1 || "Zero fees (no monthly charges, no transaction fees)"}</p>
            </div>
            <div className="flex items-start gap-3">
              <CheckSquare className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-sm font-medium">{t.lpb_feature_2 || "2% interest on savings (government subsidized)"}</p>
            </div>
            <div className="flex items-start gap-3">
              <CheckSquare className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-sm font-medium">{t.lpb_feature_6 || "Integrated with MyLennox (auto-pay rent, bills)"}</p>
            </div>
          </div>
        </Card>

        {isCitizen ? (
          <Card className="p-6 space-y-4 border-emerald-500/30 bg-emerald-500/5">
            <div className="flex items-center gap-2 text-emerald-700 font-black text-sm tracking-tight">
              <Zap className="w-4 h-4 fill-emerald-600" />
              {t.citizen_instant_approval || "INSTANT APPROVAL FOR CITIZENS"}
            </div>
            <p className="text-sm text-[#141414]/80">
              {t.citizen_approval_desc || "As a Lennoxian citizen, you can open an account in less than 1 minute with just a selfie verification."}
            </p>
            <p className="text-xs font-bold opacity-60 uppercase tracking-wider">
              {t.no_paperwork || "No paperwork • No waiting • No fees"}
            </p>
            <Button 
              className="w-full py-6 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20" 
              onClick={() => setShowApplication(true)}
            >
              {t.open_account_now || "OPEN ACCOUNT NOW"}
            </Button>
          </Card>
        ) : (
          <Card className="p-6 space-y-4 border-blue-500/30 bg-blue-500/5">
            <div className="flex items-center gap-2 text-blue-700 font-black text-sm tracking-tight">
              <Clock className="w-4 h-4" />
              {t.pr_full_verification || "FULL VERIFICATION REQUIRED"}
            </div>
            <p className="text-sm text-[#141414]/80">
              {t.pr_verification_desc || "As a permanent resident, banking regulations require full KYC verification before we can open your account."}
            </p>
            <p className="text-xs font-bold opacity-60 uppercase tracking-wider">
              {t.pr_time || "Time: 5-10 mins • Approval: 24-48 hrs"}
            </p>
            <Button 
              className="w-full py-6 text-sm font-bold bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20" 
              onClick={() => setShowApplication(true)}
            >
              {t.start_application || "START APPLICATION"}
            </Button>
          </Card>
        )}

        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest opacity-40 px-2">{t.account_types || "ACCOUNT TYPES:"}</h3>
          
          <Card className="p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xl">💵</div>
              <div>
                <p className="font-bold">{t.current_account_chk || "Current Account (Checking)"}</p>
                <p className="text-xs opacity-60">{t.current_account_desc || "Day-to-day banking"}</p>
              </div>
            </div>
            <ul className="text-xs space-y-1.5 opacity-80 pl-13">
              <li>• {t.current_account_bullet1 || "Debit card (Visa)"}</li>
              <li>• {t.current_account_bullet2 || "Direct debits (rent, bills)"}</li>
              <li>• {t.current_account_bullet3 || "No minimum balance"}</li>
            </ul>
          </Card>

          <Card className="p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xl">💰</div>
              <div>
                <p className="font-bold">{t.savings_account_chk || "Savings Account"}</p>
                <p className="text-xs opacity-60">{t.savings_account_desc || "Save for goals"}</p>
              </div>
            </div>
            <ul className="text-xs space-y-1.5 opacity-80 pl-13">
              <li>• {t.savings_account_bullet1 || "2% annual interest (paid monthly)"}</li>
              <li>• {t.savings_account_bullet2 || "No fees, no minimum balance"}</li>
              <li>• {t.savings_account_bullet3 || "Withdraw anytime (no penalties)"}</li>
            </ul>
          </Card>
          
          <p className="text-xs text-center opacity-60 font-medium px-4">
            ℹ️ {t.most_open_both || "Most customers open both accounts (takes <2 minutes)"}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function HealthTab({ profile, language }: { profile: UserProfile; language: Language }) {
  const t = translations[language];
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6 space-y-6">
      <h2 className="text-2xl font-bold tracking-tighter">{t.health_title}</h2>
      <Card className="p-6 bg-blue-600 text-white border-none">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="font-bold">{t.health_id}</p>
            <p className="text-xs opacity-60">{t.health_id_format}</p>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest opacity-60">{t.primary_gp}</p>
          <p className="font-bold">{t.fiona_campbell}</p>
          <p className="text-xs opacity-60">{t.medical_centre}</p>
        </div>
      </Card>

      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-widest opacity-40">{t.quick_actions}</h3>
        <Button variant="outline" className="w-full justify-between">
          {t.book_gp} <ChevronRight className="w-4 h-4" />
        </Button>
        <Button variant="outline" className="w-full justify-between">
          {t.prescription} <ChevronRight className="w-4 h-4" />
        </Button>
        <Button variant="outline" className="w-full justify-between">
          {t.medical_records} <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
}

function MoreItem({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button className="w-full flex items-center justify-between p-4 hover:bg-white rounded-2xl transition-all group">
      <div className="flex items-center gap-3">
        <div className="text-[#141414]/40 group-hover:text-[#141414] transition-colors">{icon}</div>
        <span className="font-medium text-sm">{label}</span>
      </div>
      <ChevronRight className="w-4 h-4 text-[#141414]/20 group-hover:translate-x-1 transition-all" />
    </button>
  );
}
