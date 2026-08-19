const admin = require('firebase-admin');
const serviceAccount = require('../thematic-grin-482015-a3-firebase-adminsdk-fbsvc-7e50f6b9fd.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

const mockArtisans = [
  {
    first_name: 'Chinedu',
    last_name: 'Okafor',
    email: 'chinedu.plumb@mock.com',
    phone: '+2348000000001',
    trade: 'Plumbing',
    location: {
      city: 'Abuja',
      state: 'FCT',
      address: 'Life Camp, Abuja'
    },
    skills: ['Pipe Fitting', 'Water Heater Install', 'Leak Repair'],
    tagline: 'Expert Plumber in Life Camp',
    bio: 'Over 10 years of experience fixing residential and commercial plumbing issues.',
    hourly_rate: 6000,
    experience_years: 10,
    is_verified: true,
    is_available: true,
    reputation_score: 4.8,
    completed_jobs: 142
  },
  {
    first_name: 'Musa',
    last_name: 'Ibrahim',
    email: 'musa.elec@mock.com',
    phone: '+2348000000002',
    trade: 'Electrical',
    location: {
      city: 'Abuja',
      state: 'FCT',
      address: 'Life Camp, Abuja'
    },
    skills: ['Wiring', 'Fault Tracing', 'Generator Install'],
    tagline: 'Reliable Electrical Contractor',
    bio: 'Quick response and safe electrical installations.',
    hourly_rate: 8000,
    experience_years: 8,
    is_verified: true,
    is_available: true,
    reputation_score: 4.9,
    completed_jobs: 89
  },
  {
    first_name: 'Aisha',
    last_name: 'Bello',
    email: 'aisha.clean@mock.com',
    phone: '+2348000000003',
    trade: 'Cleaning',
    location: {
      city: 'Abuja',
      state: 'FCT',
      address: 'Life Camp, Abuja'
    },
    skills: ['Deep Cleaning', 'Move-in Cleaning', 'Office Cleaning'],
    tagline: 'Spotless Cleaning Services',
    bio: 'Detail-oriented cleaner making your spaces shine.',
    hourly_rate: 4000,
    experience_years: 5,
    is_verified: true,
    is_available: true,
    reputation_score: 4.7,
    completed_jobs: 210
  },
  {
    first_name: 'Emeka',
    last_name: 'Nwosu',
    email: 'emeka.carp@mock.com',
    phone: '+2348000000004',
    trade: 'Carpentry',
    location: {
      city: 'Abuja',
      state: 'FCT',
      address: 'Life Camp, Abuja'
    },
    skills: ['Furniture Making', 'Repairs', 'Roofing'],
    tagline: 'Master Carpenter & Woodworker',
    bio: 'Custom furniture and durable wooden fittings.',
    hourly_rate: 7000,
    experience_years: 12,
    is_verified: true,
    is_available: false,
    reputation_score: 4.6,
    completed_jobs: 67
  }
];

async function seed() {
  for (const art of mockArtisans) {
    try {
      let userRecord;
      try {
        userRecord = await auth.getUserByPhoneNumber(art.phone);
        console.log(`User ${art.phone} already exists in Auth. Deleting...`);
        await auth.deleteUser(userRecord.uid);
      } catch (e) {
      }
      
      userRecord = await auth.createUser({
        email: art.email,
        phoneNumber: art.phone,
        password: 'Password@123!',
        displayName: `${art.first_name} ${art.last_name}`,
      });
      
      const uid = userRecord.uid;
      console.log(`Created Auth user: ${uid} for ${art.first_name}`);

      await db.collection('users').doc(uid).set({
        uid,
        first_name: art.first_name,
        last_name: art.last_name,
        email: art.email,
        phone: art.phone,
        role: 'artisan',
        created_at: admin.firestore.FieldValue.serverTimestamp()
      });

      await db.collection('artisans').doc(uid).set({
        uid,
        trade: art.trade,
        location: art.location,
        tagline: art.tagline,
        bio: art.bio,
        skills: art.skills,
        experience_years: art.experience_years,
        hourly_rate: art.hourly_rate,
        is_verified: art.is_verified,
        is_available: art.is_available,
        reputation_score: art.reputation_score,
        completed_jobs: art.completed_jobs,
        created_at: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log(`Created Artisan DB record for ${art.first_name}`);
    } catch (err) {
      console.error('Error seeding', art.first_name, err);
    }
  }
  console.log('Done!');
  process.exit(0);
}

seed();
