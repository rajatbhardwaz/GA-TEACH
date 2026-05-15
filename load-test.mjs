import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, getDocs, addDoc, collection, query, where, updateDoc, arrayUnion, deleteDoc } from "firebase/firestore";

const NUM_STUDENTS = 50;
const NUM_TEACHERS = 5;
const TEST_PASSWORD = "LoadTest2026!";

const firebaseConfig = {
  apiKey: "AIzaSyD7dEdlcfsNjCFQwJpkIAYCZ8DgW68PLws",
  authDomain: "ga-teach.firebaseapp.com",
  projectId: "ga-teach",
  storageBucket: "ga-teach.firebasestorage.app",
  messagingSenderId: "687348137396",
  appId: "1:687348137396:web:71b1f22f17b9701c6646e1",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

function elapsed(start) { return `${Date.now() - start}ms`; }
function genCode() { return Math.random().toString(36).substring(2, 8).toUpperCase(); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  console.log("===================================================");
  console.log("  GLORIOUS AMPLIFICATION - Load Test");
  console.log(`  ${NUM_TEACHERS} Teachers + ${NUM_STUDENTS} Students`);
  console.log("===================================================\n");

  const createdUsers = [];
  const createdRoomIds = [];
  const totalStart = Date.now();

  try {
    // PHASE 1: Teachers
    console.log(`PHASE 1: Creating ${NUM_TEACHERS} teachers...`);
    let start = Date.now();
    const teachers = [];
    for (let i = 1; i <= NUM_TEACHERS; i++) {
      const email = `lt_teacher_${i}_${Date.now()}@test.com`;
      try {
        const r = await createUserWithEmailAndPassword(auth, email, TEST_PASSWORD);
        await setDoc(doc(db, "users", r.user.uid), { uid: r.user.uid, email, name: `Teacher ${i}`, role: "teacher", createdAt: new Date().toISOString() });
        teachers.push({ uid: r.user.uid, email, name: `Teacher ${i}` });
        createdUsers.push({ uid: r.user.uid, email });
        console.log(`  + Teacher ${i}`);
      } catch (e) { console.log(`  x Teacher ${i}: ${e.message}`); }
      await sleep(200);
    }
    console.log(`  Done in ${elapsed(start)}\n`);

    // PHASE 2: Students
    console.log(`PHASE 2: Creating ${NUM_STUDENTS} students...`);
    start = Date.now();
    const students = [];
    for (let i = 1; i <= NUM_STUDENTS; i++) {
      const email = `lt_student_${i}_${Date.now()}@test.com`;
      try {
        const r = await createUserWithEmailAndPassword(auth, email, TEST_PASSWORD);
        await setDoc(doc(db, "users", r.user.uid), { uid: r.user.uid, email, name: `Student ${i}`, role: "student", createdAt: new Date().toISOString() });
        students.push({ uid: r.user.uid, email, name: `Student ${i}` });
        createdUsers.push({ uid: r.user.uid, email });
        if (i % 10 === 0) console.log(`  + ${i}/${NUM_STUDENTS} students created`);
      } catch (e) { console.log(`  x Student ${i}: ${e.message}`); }
      await sleep(150);
    }
    console.log(`  Done: ${students.length} students in ${elapsed(start)}\n`);

    // PHASE 3: Create Room
    console.log("PHASE 3: Creating room...");
    start = Date.now();
    const roomCode = genCode();
    const roomRef = await addDoc(collection(db, "rooms"), {
      roomName: "Load Test Batch", subject: "Stress Testing",
      teacherName: teachers[0]?.name || "Teacher", teacherId: teachers[0]?.uid || "",
      roomCode, createdAt: new Date().toISOString(), participants: [], isActive: false,
    });
    createdRoomIds.push(roomRef.id);
    console.log(`  Room: "${roomCode}" in ${elapsed(start)}\n`);

    // PHASE 4: Students join
    console.log(`PHASE 4: ${students.length} students joining...`);
    start = Date.now();
    for (let i = 0; i < students.length; i += 10) {
      const batch = students.slice(i, i + 10);
      await Promise.all(batch.map(s => updateDoc(doc(db, "rooms", roomRef.id), { participants: arrayUnion(s.uid) }).catch(e => console.log(`  x ${s.name}: ${e.message}`))));
      console.log(`  Joined: ${Math.min(i + 10, students.length)}/${students.length}`);
    }
    const snap = await getDoc(doc(db, "rooms", roomRef.id));
    console.log(`  Verified: ${snap.data()?.participants?.length || 0} participants in ${elapsed(start)}\n`);

    // PHASE 5: Go Live
    console.log("PHASE 5: Starting meeting...");
    await updateDoc(doc(db, "rooms", roomRef.id), { isActive: true });
    console.log("  Room is LIVE\n");

    // PHASE 6: Attendance
    console.log("PHASE 6: Writing attendance...");
    start = Date.now();
    const all = [...teachers.map(t => ({ ...t, role: "teacher" })), ...students.map(s => ({ ...s, role: "student" }))];
    let attCount = 0;
    for (let i = 0; i < all.length; i += 15) {
      const batch = all.slice(i, i + 15);
      await Promise.all(batch.map(u => addDoc(collection(db, "attendance"), {
        roomId: roomRef.id, userId: u.uid, userName: u.name, userRole: u.role,
        joinTime: new Date().toISOString(), leaveTime: null, duration: null,
      }).then(() => attCount++).catch(() => {})));
    }
    console.log(`  ${attCount} records in ${elapsed(start)}\n`);

    // PHASE 7: Query perf
    console.log("PHASE 7: Query performance...");
    start = Date.now();
    const tq = await getDocs(query(collection(db, "rooms"), where("teacherId", "==", teachers[0]?.uid)));
    console.log(`  Teacher rooms: ${tq.size} in ${elapsed(start)}`);

    start = Date.now();
    const sq = await getDocs(query(collection(db, "rooms"), where("participants", "array-contains", students[0]?.uid)));
    console.log(`  Student rooms: ${sq.size} in ${elapsed(start)}`);

    start = Date.now();
    const aq = await getDocs(query(collection(db, "attendance"), where("roomId", "==", roomRef.id)));
    console.log(`  Attendance: ${aq.size} records in ${elapsed(start)}`);

    start = Date.now();
    await Promise.all(students.slice(0, 20).map(s => getDocs(query(collection(db, "rooms"), where("participants", "array-contains", s.uid)))));
    console.log(`  20 concurrent queries: ${elapsed(start)}\n`);

    // PHASE 8: End meeting
    console.log("PHASE 8: Ending meeting...");
    start = Date.now();
    let lc = 0;
    for (let i = 0; i < all.length; i += 15) {
      const batch = all.slice(i, i + 15);
      await Promise.all(batch.map(u => addDoc(collection(db, "attendance"), {
        roomId: roomRef.id, userId: u.uid, userName: u.name, userRole: u.role,
        joinTime: new Date(Date.now() - 3600000).toISOString(), leaveTime: new Date().toISOString(), duration: 60,
      }).then(() => lc++).catch(() => {})));
    }
    await updateDoc(doc(db, "rooms", roomRef.id), { isActive: false });
    console.log(`  ${lc} leave records in ${elapsed(start)}\n`);

    // RESULTS
    console.log("===================================================");
    console.log("  RESULTS");
    console.log("===================================================");
    console.log(`  Teachers:      ${teachers.length}/${NUM_TEACHERS}`);
    console.log(`  Students:      ${students.length}/${NUM_STUDENTS}`);
    console.log(`  Attendance:    ${attCount + lc} records`);
    console.log(`  Total time:    ${elapsed(totalStart)}`);
    console.log("===================================================\n");

  } finally {
    // CLEANUP
    console.log("CLEANUP...");
    for (const rid of createdRoomIds) {
      const as2 = await getDocs(query(collection(db, "attendance"), where("roomId", "==", rid)));
      for (const d of as2.docs) await deleteDoc(doc(db, "attendance", d.id)).catch(() => {});
      await deleteDoc(doc(db, "rooms", rid)).catch(() => {});
    }
    for (const u of createdUsers) await deleteDoc(doc(db, "users", u.uid)).catch(() => {});
    console.log("  Test data cleaned up (auth accounts remain in Firebase Console)");
    console.log("  Done!\n");
    process.exit(0);
  }
}

run();
