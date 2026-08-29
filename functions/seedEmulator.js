process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8085';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9095';

const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

initializeApp({ projectId: 'artiva-f24a8' });

const db = getFirestore();
const auth = getAuth();

const mockArtisans = [
  {
    first_name: 'Mr. Emeka',
    last_name: 'Okonkwo',
    email: 'emeka.plumbing@artiva.app',
    phone: '+2348031234567',
    trade: 'Plumbing',
    location: {
      city: 'Abuja',
      state: 'FCT',
      address: 'Life Camp, Abuja'
    },
    skills: ['PPR Welding', 'Bathroom Drainage', 'Water Heater Repair'],
    tagline: '25 Yrs Oasis Plumbing Lead — Life Camp Specialist',
    bio: 'Experienced master plumber with over 15 years servicing residential estates in Life Camp.',
    hourly_rate: 6500,
    experience_years: 15,
    is_verified: true,
    verification_status: 'approved',
    is_available: true,
    reputation_score: 4.95,
    completed_jobs: 48
  },
  {
    first_name: 'Sunday',
    last_name: 'Okafor',
    email: 'sunday.elec@artiva.app',
    phone: '+2348039876543',
    trade: 'Electrical',
    location: {
      city: 'Abuja',
      state: 'FCT',
      address: 'Life Camp, Abuja'
    },
    skills: ['Inverter Systems', 'Distribution Board Wiring', 'Industrial Surge Protection'],
    tagline: 'Certified High-Voltage & Solar Technician',
    bio: 'Certified electrical engineer offering safe wiring, solar installations, and fault clearance.',
    hourly_rate: 8000,
    experience_years: 12,
    is_verified: true,
    verification_status: 'approved',
    is_available: true,
    reputation_score: 4.9,
    completed_jobs: 37
  },
  {
    first_name: 'Ibrahim',
    last_name: 'Musa',
    email: 'ibrahim.ac@artiva.app',
    phone: '+2348021112233',
    trade: 'AC Repair',
    location: {
      city: 'Abuja',
      state: 'FCT',
      address: 'Life Camp, Abuja'
    },
    skills: ['Inverter R410A Gas Refill', 'Compressor Replacement', 'PCB Diagnostic'],
    tagline: 'HVAC Certified Cooling Specialist',
    bio: 'Expert in residential and commercial inverter AC servicing, gas charging, and diagnostics.',
    hourly_rate: 7500,
    experience_years: 9,
    is_verified: true,
    verification_status: 'approved',
    is_available: true,
    reputation_score: 4.85,
    completed_jobs: 29
  },
  {
    first_name: 'Blessing',
    last_name: 'Adebayo',
    email: 'blessing.paint@artiva.app',
    phone: '+2348054445566',
    trade: 'Painting',
    location: {
      city: 'Abuja',
      state: 'FCT',
      address: 'Life Camp, Abuja'
    },
    skills: ['Screeding & Stucco', 'Satin Finish', 'Exterior Waterproofing'],
    tagline: 'Master Finisher & Color Consultant',
    bio: 'Specialist in smooth wall screeding, Italian marble effect, and waterproof exterior paints.',
    hourly_rate: 5000,
    experience_years: 7,
    is_verified: true,
    verification_status: 'approved',
    is_available: true,
    reputation_score: 4.88,
    completed_jobs: 22
  },
  {
    first_name: 'Tunde',
    last_name: 'Bakare',
    email: 'tunde.carp@artiva.app',
    phone: '+2348077778899',
    trade: 'Carpentry',
    location: {
      city: 'Abuja',
      state: 'FCT',
      address: 'Life Camp, Abuja'
    },
    skills: ['HDF Wardrobes', 'Cabinetry Restoration', 'Acoustic Door Installation'],
    tagline: 'Architectural Woodcraft & Joinery',
    bio: 'Precision furniture builder, modern kitchen cabinets, and roof truss repairs.',
    hourly_rate: 7000,
    experience_years: 11,
    is_verified: true,
    verification_status: 'approved',
    is_available: true,
    reputation_score: 4.92,
    completed_jobs: 31
  },
  {
    first_name: 'Chidi',
    last_name: 'Nnamdi',
    email: 'chidi.gen@artiva.app',
    phone: '+2348099990011',
    trade: 'Generators',
    location: {
      city: 'Abuja',
      state: 'FCT',
      address: 'Life Camp, Abuja'
    },
    skills: ['Mikano/Perkins Overhaul', 'ATS Synchronizer', 'AVR Troubleshooting'],
    tagline: 'Heavy Diesel & Soundproof Plant Expert',
    bio: 'Diesel generator mechanic for Perkins, Cummins, Lister, and automated changeover switches.',
    hourly_rate: 9000,
    experience_years: 14,
    is_verified: true,
    verification_status: 'approved',
    is_available: true,
    reputation_score: 4.96,
    completed_jobs: 44
  }
];

async function runSeed() {
  console.log('Seeding Life Camp verified artisans into emulator...');
  for (const art of mockArtisans) {
    try {
      const uid = `art_${art.trade.toLowerCase().replace(/[^a-z]/g, '')}_${Date.now().toString().slice(-4)}`;
      
      try {
        await auth.createUser({
          uid,
          email: art.email,
          phoneNumber: art.phone,
          displayName: `${art.first_name} ${art.last_name}`,
        });
      } catch (e) {}

      await db.collection('users').doc(uid).set({
        uid,
        first_name: art.first_name,
        last_name: art.last_name,
        email: art.email,
        phone: art.phone,
        role: 'artisan',
        created_at: FieldValue.serverTimestamp()
      });

      const profileData = {
        uid,
        first_name: art.first_name,
        last_name: art.last_name,
        trade: art.trade,
        trade_needed: art.trade,
        location: art.location,
        tagline: art.tagline,
        bio: art.bio,
        skills: art.skills,
        experience_years: art.experience_years,
        hourly_rate: art.hourly_rate,
        is_verified: art.is_verified,
        verification_status: art.verification_status,
        is_available: art.is_available,
        reputation_score: art.reputation_score,
        completed_jobs: art.completed_jobs,
        work_photos: [
          'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=600&q=80'
        ],
        created_at: FieldValue.serverTimestamp()
      };

      await db.collection('artisan_profiles').doc(uid).set(profileData);
      await db.collection('artisans').doc(uid).set(profileData);

      console.log(`✓ Seeded ${art.first_name} (${art.trade})`);
    } catch (err) {
      console.error(`Error seeding ${art.first_name}:`, err.message);
    }
  }
  console.log('Seeding completed successfully!');
  process.exit(0);
}

runSeed();
