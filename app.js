// app.js (ESM)
// ===== Firebase Init =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";
import {
  getAuth, onAuthStateChanged,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendPasswordResetEmail, signOut, updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, collection, doc, getDoc, getDocs, setDoc, addDoc,
  updateDoc, serverTimestamp, query, where, orderBy, onSnapshot, limit
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCQSyOBo8piJ1Je_fLtA7frZ7QDUKhAy18",
  authDomain: "job-neo-852c8.firebaseapp.com",
  projectId: "job-neo-852c8",
  storageBucket: "job-neo-852c8.firebasestorage.app",
  messagingSenderId: "117234893773",
  appId: "1:117234893773:web:3081cde10e48248ce1fa84",
  measurementId: "G-4VLX6VYH6R"
};

const appFB = initializeApp(firebaseConfig);
try { getAnalytics(appFB); } catch { /* analytics optional on localhost */ }

const auth = getAuth();
const db = getFirestore();

// ===== App State & Config =====
const app = {
  currentUser: null,
  currentView: 'homepage',
  currentStep: 1,
  savedJobs: new Set(),
  activeFilters: { departments: new Set(), levels: new Set(), search: '' },
  departments: ["Mathematics","Statistics","Computer Science","Information Technology","Physics","Chemistry","Biology","Engineering","Economics","Management"],
  levels: ["Assistant Professor","Associate Professor","Professor","Lecturer","Research Scientist","Postdoc"],
  appConfig: {
    validJobPolicy: "ADMIN_APPROVAL",
    trustedEmployerMinLevel: 2
  },
  jobsUnsub: null,
  cachedJobs: [],

  // ===== Init =====
  init() {
    this.setupEventListeners();
    this.renderFilters();
    this.checkAuthState();
    this.subscribeJobs(); // live render
    console.log("Faculty Jobs App (Firebase) initialized");
  },

  // ===== Firebase Data =====
  async ensureSeedJob() {
    // if no jobs -> seed IIT Patna approved job so it appears instantly
    const qJobs = query(collection(db, "jobs"), limit(1));
    const snap = await getDocs(qJobs);
    if (!snap.empty) return;

    const now = new Date();
    const seed = {
      title: "Assistant Professor – Mathematics",
      institution: "IIT Patna",
      location: "Patna, Bihar, India",
      departments: ["Mathematics", "Statistics"],
      levels: ["Assistant Professor"],
      description: "Teach UG/PG, guide projects, contribute to research in control theory. We are looking for candidates with strong background in mathematics and statistics.",
      applicationLink: "https://example.com/apply",
      deadline: new Date("2025-09-25"),
      approved: true,
      approved_at: now,
      created_by: "seed",
      active: true,
      archived: false,
      created_at: now
    };
    await addDoc(collection(db, "jobs"), seed);
  },

  subscribeJobs() {
    // live query; we’ll locally categorize into open/closing/archived
    const jobsRef = collection(db, "jobs");
    const unsub = onSnapshot(
      query(jobsRef, orderBy("approved_at", "desc")),
      (snap) => {
        this.cachedJobs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        this.renderJobs(); // re-render on any change
      },
      (err) => console.error("Jobs subscription error:", err)
    );
    this.jobsUnsub = unsub;
    this.ensureSeedJob().catch(console.error);
  },

  // ===== Auth =====
  checkAuthState() {
    onAuthStateChanged(auth, async (user) => {
      this.currentUser = user;
      await this.updateAuthStateUI();
      if (user) {
        // load saved jobs
        this.loadSavedJobs().catch(console.error);
      } else {
        this.savedJobs = new Set();
      }
      this.renderJobs();
    });
  },

  async loadSavedJobs() {
    if (!this.currentUser) return;
    const savedRef = collection(db, "users", this.currentUser.uid, "savedJobs");
    const snap = await getDocs(savedRef);
    this.savedJobs = new Set(snap.docs.map(d => d.id));
  },

  async handleLogin(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const email = fd.get("email");
    const password = fd.get("password");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      this.toast("Login successful!", "success");
      this.showView('homepage');
    } catch (err) {
      this.toast(err.message, "error");
    }
  },

  async handleRegister(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const email = fd.get("email");
    const password = fd.get("password");
    const displayName = fd.get("displayName");
    const role = fd.get("role");
    const orgName = document.getElementById("orgNameInput").value || null;
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName) await updateProfile(cred.user, { displayName });

      // default admin if email matches (demo only)
      const finalRole = (email === "admin@facultyjobs.com") ? "admin" : role || "candidate";
      const trust_level = finalRole === "employer" ? 1 : (finalRole === "admin" ? 5 : 0);

      await setDoc(doc(db, "users", cred.user.uid), {
        uid: cred.user.uid,
        email, displayName, role: finalRole,
        orgName: finalRole === "employer" ? orgName : null,
        verifiedEmail: true,
        trust_level,
        created_at: serverTimestamp()
      });

      this.toast("Registration successful!", "success");
      this.showView('homepage');
    } catch (err) {
      this.toast(err.message, "error");
    }
  },

  async handleForgotPassword(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const email = fd.get("email");
    try {
      await sendPasswordResetEmail(auth, email);
      this.toast("Password reset link sent", "success");
      this.showAuthForm('login');
    } catch (err) {
      this.toast(err.message, "error");
    }
  },

  async logout() {
    await signOut(auth);
    this.toast("Logged out successfully", "success");
    this.showView('homepage');
  },

  async getCurrentUserDoc() {
    if (!this.currentUser) return null;
    const ref = doc(db, "users", this.currentUser.uid);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  },

  // ===== UI wiring =====
  setupEventListeners() {
    // nav
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const postJobBtn = document.getElementById('postJobBtn');
    const adminBtn = document.getElementById('adminBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    loginBtn?.addEventListener('click', (e)=>{e.preventDefault(); this.showView('auth'); this.showAuthForm('login');});
    registerBtn?.addEventListener('click', (e)=>{e.preventDefault(); this.showView('auth'); this.showAuthForm('register');});
    postJobBtn?.addEventListener('click', (e)=>{e.preventDefault(); this.showView('postJob');});
    adminBtn?.addEventListener('click', (e)=>{e.preventDefault(); this.showView('admin');});
    logoutBtn?.addEventListener('click', (e)=>{e.preventDefault(); this.logout();});

    // auth forms
    document.getElementById('switchToRegister')?.addEventListener('click', e=>{e.preventDefault(); this.showAuthForm('register');});
    document.getElementById('switchToLogin')?.addEventListener('click', e=>{e.preventDefault(); this.showAuthForm('login');});
    document.getElementById('forgotPasswordLink')?.addEventListener('click', e=>{e.preventDefault(); this.showAuthForm('forgotPassword');});
    document.getElementById('backToLogin')?.addEventListener('click', e=>{e.preventDefault(); this.showAuthForm('login');});

    document.getElementById('roleSelect')?.addEventListener('change', (e)=>{
      const g = document.getElementById('orgNameGroup');
      const inp = document.getElementById('orgNameInput');
      if (e.target.value === 'employer') { g.classList.remove('hidden'); inp.required = true; }
      else { g.classList.add('hidden'); inp.required = false; }
    });

    document.getElementById('loginFormElement')?.addEventListener('submit', (e)=>this.handleLogin(e));
    document.getElementById('registerFormElement')?.addEventListener('submit', (e)=>this.handleRegister(e));
    document.getElementById('forgotPasswordFormElement')?.addEventListener('submit', (e)=>this.handleForgotPassword(e));

    // search
    document.getElementById('searchInput')?.addEventListener('input', (e)=>{
      this.activeFilters.search = e.target.value.toLowerCase();
      this.renderJobs();
    });
    document.getElementById('clearFiltersBtn')?.addEventListener('click', (e)=>{e.preventDefault(); this.clearAllFilters();});

    // post job flow
    document.getElementById('nextStepBtn')?.addEventListener('click', ()=>this.nextStep());
    document.getElementById('prevStepBtn')?.addEventListener('click', ()=>this.prevStep());
    document.getElementById('submitJobBtn')?.addEventListener('click', ()=>this.submitJob());

    // admin tabs
    document.querySelectorAll('.tab-btn').forEach(btn=>{
      btn.addEventListener('click',(e)=>{
        e.preventDefault();
        this.showAdminTab(e.target.dataset.tab);
      });
    });

    document.getElementById('saveConfigBtn')?.addEventListener('click', (e)=>{e.preventDefault(); this.saveConfig();});

    // modal
    document.getElementById('closeModal')?.addEventListener('click',(e)=>{e.preventDefault(); this.closeModal();});
    document.querySelector('.modal-overlay')?.addEventListener('click',(e)=>{e.preventDefault(); this.closeModal();});
    document.getElementById('shareJobBtn')?.addEventListener('click',(e)=>{e.preventDefault(); this.shareJob();});
    document.getElementById('saveJobBtn')?.addEventListener('click',(e)=>{e.preventDefault(); this.toggleSaveJobFromModal();});
    document.getElementById('applyJobBtn')?.addEventListener('click',(e)=>{e.preventDefault(); this.applyToJob();});
  },

  async updateAuthStateUI() {
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const postJobBtn = document.getElementById('postJobBtn');
    const adminBtn = document.getElementById('adminBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    const emptyMessage = document.getElementById('emptyStateMessage');

    if (this.currentUser) {
      loginBtn?.classList.add('hidden');
      registerBtn?.classList.add('hidden');
      logoutBtn?.classList.remove('hidden');

      const udoc = await this.getCurrentUserDoc();
      const role = udoc?.role || 'candidate';
      if (role === 'employer') postJobBtn?.classList.remove('hidden');
      else postJobBtn?.classList.add('hidden');
      if (role === 'admin') adminBtn?.classList.remove('hidden');
      else adminBtn?.classList.add('hidden');

      if (emptyMessage) emptyMessage.textContent = role === 'employer' ? 'Be the first to post a job.' : 'No matches—try clearing filters.';
    } else {
      loginBtn?.classList.remove('hidden');
      registerBtn?.classList.remove('hidden');
      postJobBtn?.classList.add('hidden');
      adminBtn?.classList.add('hidden');
      logoutBtn?.classList.add('hidden');
    }
  },

  showView(viewName) {
    document.querySelectorAll('.view').forEach(v=>v.classList.add('hidden'));
    document.getElementById(viewName+'View')?.classList.remove('hidden');
    this.currentView = viewName;
    const titles = {
      homepage: 'Faculty Jobs • Neo',
      auth: 'Login - Faculty Jobs • Neo',
      postJob: 'Post a Job - Faculty Jobs • Neo',
      admin: 'Admin Dashboard - Faculty Jobs • Neo'
    };
    document.title = titles[viewName] || 'Faculty Jobs • Neo';
  },

  showAuthForm(formName) {
    document.querySelectorAll('.auth-form').forEach(f=>f.classList.add('hidden'));
    document.getElementById(formName+'Form')?.classList.remove('hidden');
  },

  // ===== Filters & Rendering =====
  renderFilters() {
    const departmentFilters = document.getElementById('departmentFilters');
    const levelFilters = document.getElementById('levelFilters');
    if (!departmentFilters || !levelFilters) return;

    departmentFilters.innerHTML = '';
    levelFilters.innerHTML = '';

    this.departments.forEach(dept=>{
      const chip = document.createElement('button');
      chip.className = 'filter-chip';
      chip.textContent = dept;
      chip.addEventListener('click',(e)=>{
        e.preventDefault();
        if (this.activeFilters.departments.has(dept)) this.activeFilters.departments.delete(dept);
        else this.activeFilters.departments.add(dept);
        chip.classList.toggle('active');
        this.renderJobs();
      });
      departmentFilters.appendChild(chip);
    });

    this.levels.forEach(level=>{
      const chip = document.createElement('button');
      chip.className = 'filter-chip';
      chip.textContent = level;
      chip.addEventListener('click',(e)=>{
        e.preventDefault();
        if (this.activeFilters.levels.has(level)) this.activeFilters.levels.delete(level);
        else this.activeFilters.levels.add(level);
        chip.classList.toggle('active');
        this.renderJobs();
      });
      levelFilters.appendChild(chip);
    });
  },

  clearAllFilters() {
    this.activeFilters = { departments: new Set(), levels: new Set(), search: '' };
    document.getElementById('searchInput').value = '';
    document.querySelectorAll('.filter-chip.active').forEach(el=>el.classList.remove('active'));
    this.renderJobs();
  },

  getFilteredJobs() {
    return this.cachedJobs.filter(job=>{
      // search
      if (this.activeFilters.search) {
        const txt = `${job.title} ${job.institution} ${job.location} ${(job.departments||[]).join(' ')}`.toLowerCase();
        if (!txt.includes(this.activeFilters.search)) return false;
      }
      // department
      if (this.activeFilters.departments.size>0) {
        const ok = (job.departments||[]).some(d=>this.activeFilters.departments.has(d));
        if (!ok) return false;
      }
      // level
      if (this.activeFilters.levels.size>0) {
        const ok = (job.levels||[]).some(l=>this.activeFilters.levels.has(l));
        if (!ok) return false;
      }
      return true;
    });
  },

  renderJobs() {
    const openPositions = document.getElementById('openPositions');
    const closingSoon = document.getElementById('closingSoon');
    const archivedJobs = document.getElementById('archivedJobs');
    const openPositionsEmpty = document.getElementById('openPositionsEmpty');
    if (!openPositions) return;

    openPositions.innerHTML = '';
    if (closingSoon) closingSoon.innerHTML = '';
    if (archivedJobs) archivedJobs.innerHTML = '';

    const now = new Date();
    const in30d = new Date(now.getTime()+30*24*60*60*1000);
    const filtered = this.getFilteredJobs();

    const open = filtered.filter(j=>j.approved && !j.archived && j.active!==false)
      .sort((a,b)=> new Date(b.approved_at||b.created_at) - new Date(a.approved_at||a.created_at));

    const closing = filtered.filter(j=> j.approved && !j.archived && j.active!==false &&
      j.deadline && new Date(j.deadline) <= in30d)
      .sort((a,b)=> new Date(a.deadline) - new Date(b.deadline));

    const archived = filtered.filter(j=> j.archived || (j.deadline && new Date(j.deadline) < now))
      .sort((a,b)=> new Date(b.approved_at||b.created_at) - new Date(a.approved_at||a.created_at));

    if (open.length === 0) openPositionsEmpty?.classList.remove('hidden');
    else openPositionsEmpty?.classList.add('hidden');

    open.forEach(job=> openPositions.appendChild(this.createJobCard(job)));
    closing?.forEach(job=> closingSoon.appendChild(this.createJobCard(job)));
    archived?.forEach(job=> archivedJobs.appendChild(this.createJobCard(job)));

    // also update admin lists if admin view is open
    this.renderAdminLists();
  },

  formatDate(date) {
    if (!date) return '';
    const d = new Date(date.seconds ? date.seconds*1000 : date);
    const dd = String(d.getDate()).padStart(2,'0');
    const mm = String(d.getMonth()+1).padStart(2,'0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  },

  createJobCard(job) {
    const card = document.createElement('div');
    card.className = 'job-card';
    card.dataset.jobId = job.id;

    const deadline = this.formatDate(job.deadline);
    const description = (job.description||'').length>140 ?
      job.description.substring(0,140)+'…' : (job.description||'');

    const isSaved = this.savedJobs.has(job.id);

    card.innerHTML = `
      <div class="job-card-title">${job.title||''}</div>
      <div class="job-card-institution">${job.institution||''} • ${job.location||''}</div>
      ${job.approved ? '<div class="job-card-status">Approved</div>' : ''}
      <div class="job-card-chips">
        ${(job.departments||[]).map(d=>`<span class="job-chip job-chip--department">${d}</span>`).join('')}
        ${(job.levels||[]).map(l=>`<span class="job-chip job-chip--level">${l}</span>`).join('')}
      </div>
      <div class="job-card-description">${description}</div>
      <div class="job-card-deadline">${deadline}</div>
      <div class="job-card-actions">
        <button class="btn btn--primary btn--sm" onclick="window.open('${job.applicationLink||'#'}','_blank')">Apply</button>
        <button class="btn btn--outline btn--sm" onclick="window.app.showJobDetails('${job.id}')">Details</button>
        <button class="btn btn--secondary btn--sm ${isSaved?'saved':''}" onclick="window.app.toggleSaveJob(event,'${job.id}')">${isSaved?'Saved':'Save'}</button>
      </div>
    `;
    return card;
  },

  // ===== Post Job Flow =====
  nextStep() {
    if (this.currentStep===1) {
      // build preview
      const job = this.collectJobForm();
      const preview = document.getElementById('previewCard');
      preview.innerHTML = this.createJobCard({...job,id:'preview'}).innerHTML;
      document.getElementById('step1').classList.add('hidden');
      document.getElementById('step2').classList.remove('hidden');
      document.getElementById('prevStepBtn').disabled = false;
      document.getElementById('submitJobBtn').classList.add('hidden');
      this.currentStep = 2;
    } else if (this.currentStep===2) {
      document.getElementById('step2').classList.add('hidden');
      document.getElementById('step3').classList.remove('hidden');
      document.getElementById('submitJobBtn').classList.remove('hidden');
      this.currentStep = 3;
    }
  },
  prevStep() {
    if (this.currentStep===2) {
      document.getElementById('step2').classList.add('hidden');
      document.getElementById('step1').classList.remove('hidden');
      document.getElementById('prevStepBtn').disabled = true;
      this.currentStep = 1;
    } else if (this.currentStep===3) {
      document.getElementById('step3').classList.add('hidden');
      document.getElementById('step2').classList.remove('hidden');
      document.getElementById('submitJobBtn').classList.add('hidden');
      this.currentStep = 2;
    }
  },
  collectJobForm() {
    const f = document.getElementById('jobDetailsForm');
    const fd = new FormData(f);
    const departments = [...document.querySelectorAll('#departmentCheckboxes input[type=checkbox]:checked')].map(i=>i.value);
    const levels = [...document.querySelectorAll('#levelCheckboxes input[type=checkbox]:checked')].map(i=>i.value);
    const city = fd.get('city'), state = fd.get('state'), country = fd.get('country');
    return {
      title: fd.get('title')?.trim(),
      institution: fd.get('institution')?.trim(),
      location: `${city}, ${state}, ${country}`,
      departments, levels,
      description: fd.get('description')?.trim(),
      applicationLink: fd.get('applicationLink')?.trim(),
      deadline: fd.get('deadline') ? new Date(fd.get('deadline')) : null
    };
  },
  async submitJob() {
    if (!this.currentUser) { this.toast("Login as employer to post", "error"); return; }
    const udoc = await this.getCurrentUserDoc();
    if (udoc?.role!=='employer' && udoc?.role!=='admin') {
      this.toast("Only employers/admin can post jobs", "error"); return;
    }
    const job = this.collectJobForm();

    // validation policy
    const autoPublish = (this.appConfig.validJobPolicy === 'AUTO_PUBLISH_TRUSTED')
      && (udoc?.trust_level ?? 0) >= (this.appConfig.trustedEmployerMinLevel ?? 2);

    const payload = {
      ...job,
      approved: !!autoPublish,
      approved_at: autoPublish ? new Date() : null,
      created_by: this.currentUser.uid,
      active: true, archived: false,
      created_at: new Date()
    };
    await addDoc(collection(db, "jobs"), payload);
    this.toast(autoPublish ? "Job published!" : "Job submitted for review", "success");
    this.showView('homepage');
    this.currentStep = 1;
    document.getElementById('step3').classList.add('hidden');
    document.getElementById('step1').classList.remove('hidden');
    document.getElementById('submitJobBtn').classList.add('hidden');
    document.getElementById('prevStepBtn').disabled = true;
  },

  // ===== Admin =====
  async renderAdminLists() {
    const udoc = await this.getCurrentUserDoc();
    if (!udoc || udoc.role!=='admin') return;

    const pendingList = document.getElementById('pendingJobsList');
    const approvedList = document.getElementById('approvedJobsList');
    const usersList = document.getElementById('usersList');
    if (pendingList) pendingList.innerHTML = '';
    if (approvedList) approvedList.innerHTML = '';
    if (usersList) usersList.innerHTML = '';

    const pending = this.cachedJobs.filter(j=>!j.approved && !j.archived);
    const approved = this.cachedJobs.filter(j=>j.approved && !j.archived);

    pending.forEach(j=>{
      const el = document.createElement('div');
      el.className = 'admin-job';
      el.innerHTML = `
        <div><strong>${j.title}</strong> — ${j.institution} • ${j.location}</div>
        <div class="gap-8">
          <button class="btn btn--primary btn--sm" data-act="approve" data-id="${j.id}">Approve</button>
          <button class="btn btn--outline btn--sm" data-act="archive" data-id="${j.id}">Archive</button>
        </div>`;
      pendingList?.appendChild(el);
    });

    approved.forEach(j=>{
      const el = document.createElement('div');
      el.className = 'admin-job';
      el.innerHTML = `
        <div><strong>${j.title}</strong> — ${j.institution} • ${j.location}</div>
        <div class="gap-8">
          <button class="btn btn--outline btn--sm" data-act="archive" data-id="${j.id}">Archive</button>
        </div>`;
      approvedList?.appendChild(el);
    });

    // button actions (event delegation)
    document.querySelectorAll('#pendingJobsList [data-act], #approvedJobsList [data-act]').forEach(btn=>{
      btn.addEventListener('click', async (e)=>{
        const id = e.currentTarget.getAttribute('data-id');
        const act = e.currentTarget.getAttribute('data-act');
        const ref = doc(db, "jobs", id);
        if (act==='approve') await updateDoc(ref, { approved: true, approved_at: new Date() });
        if (act==='archive') await updateDoc(ref, { archived: true, active: false });
        this.toast(`Job ${act}d`, "success");
      });
    });
  },

  showAdminTab(tab) {
    document.querySelectorAll('.admin-tab').forEach(el=>el.classList.add('hidden'));
    if (tab==='pending') document.getElementById('pendingJobsTab')?.classList.remove('hidden');
    if (tab==='approved') document.getElementById('approvedJobsTab')?.classList.remove('hidden');
    if (tab==='users') document.getElementById('usersTab')?.classList.remove('hidden');
    if (tab==='config') document.getElementById('configTab')?.classList.remove('hidden');
    document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
    document.querySelector(`.tab-btn[data-tab="${tab}"]`)?.classList.add('active');
  },

  saveConfig() {
    const p = document.getElementById('validJobPolicy').value;
    const tl = parseInt(document.getElementById('trustedEmployerMinLevel').value||'2',10);
    this.appConfig.validJobPolicy = p;
    this.appConfig.trustedEmployerMinLevel = tl;
    this.toast("Settings saved (local to client).", "success");
  },

  // ===== Modal & Misc =====
  showJobDetails(jobId) {
    const job = this.cachedJobs.find(j=>j.id===jobId);
    if (!job) return;
    document.getElementById('modalJobTitle').textContent = job.title||'Job Details';
    document.getElementById('modalBody').innerHTML = `
      <p><strong>Institution:</strong> ${job.institution} • ${job.location}</p>
      <p><strong>Departments:</strong> ${(job.departments||[]).join(', ')}</p>
      <p><strong>Levels:</strong> ${(job.levels||[]).join(', ')}</p>
      <p><strong>Deadline:</strong> ${this.formatDate(job.deadline)}</p>
      <p>${job.description||''}</p>`;
    document.querySelector('.modal-overlay')?.classList.remove('hidden');
    document.getElementById('jobModal')?.classList.remove('hidden');
    document.getElementById('saveJobBtn')?.setAttribute('data-id', job.id);
    document.getElementById('applyJobBtn')?.setAttribute('data-link', job.applicationLink||'#');
  },
  closeModal() {
    document.querySelector('.modal-overlay')?.classList.add('hidden');
    document.getElementById('jobModal')?.classList.add('hidden');
  },
  async toggleSaveJob(e, jobId) {
    if (!this.currentUser) { this.toast("Login to save jobs", "error"); return; }
    const ref = doc(db, "users", this.currentUser.uid, "savedJobs", jobId);
    if (this.savedJobs.has(jobId)) {
      // remove
      await setDoc(ref, { saved: false }, { merge: true });
      this.savedJobs.delete(jobId);
      e.currentTarget.classList.remove('saved');
      e.currentTarget.textContent = 'Save';
    } else {
      await setDoc(ref, { saved: true, saved_at: serverTimestamp() });
      this.savedJobs.add(jobId);
      e.currentTarget.classList.add('saved');
      e.currentTarget.textContent = 'Saved';
    }
  },
  async toggleSaveJobFromModal() {
    const btn = document.getElementById('saveJobBtn');
    const jobId = btn.getAttribute('data-id');
    // emulate clicking the card save when modal is open
    await this.toggleSaveJob({ currentTarget: btn }, jobId);
  },
  applyToJob() {
    const link = document.getElementById('applyJobBtn').getAttribute('data-link') || '#';
    window.open(link, '_blank');
  },
  shareJob() {
    try {
      const url = window.location.href;
      navigator.clipboard.writeText(url);
      this.toast("Job link copied!", "success");
    } catch {
      this.toast("Copy failed", "error");
    }
  },

  // ===== Utility =====
  toast(msg, type='info') {
    // Minimal toast; you can style via CSS
    console.log(`[${type}]`, msg);
    alert(msg);
  },

  // Build the checkbox lists on first load of Post Job view
  ensurePostJobCheckboxes() {
    const depBox = document.getElementById('departmentCheckboxes');
    const lvlBox = document.getElementById('levelCheckboxes');
    if (!depBox || !lvlBox || depBox.childElementCount>0 || lvlBox.childElementCount>0) return;
    this.departments.forEach(d=>{
      const id = `dep_${d.replace(/\s+/g,'_')}`;
      depBox.insertAdjacentHTML('beforeend', `
        <label><input type="checkbox" value="${d}" id="${id}"> ${d}</label>
      `);
    });
    this.levels.forEach(l=>{
      const id = `lvl_${l.replace(/\s+/g,'_')}`;
      lvlBox.insertAdjacentHTML('beforeend', `
        <label><input type="checkbox" value="${l}" id="${id}"> ${l}</label>
      `);
    });
  }
};

// Expose to window for inline onclicks in HTML we generated
window.app = app;

// Run init when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { app.init(); app.ensurePostJobCheckboxes(); });
} else {
  app.init(); app.ensurePostJobCheckboxes();
}
