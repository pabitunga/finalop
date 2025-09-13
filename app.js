// Faculty Jobs • Neo - Main Application Logic
// This is a demo implementation with simulated Firebase functionality

class FacultyJobsApp {
    constructor() {
        this.currentUser = null;
        this.currentView = 'homepage';
        this.currentStep = 1;
        this.jobs = [];
        this.users = [];
        this.appConfig = {
            validJobPolicy: "ADMIN_APPROVAL",
            autoValidation: {
                requireVerifiedEmail: true,
                requiredFields: ["title", "institution", "location", "departments", "levels", "deadline"]
            },
            trustedEmployerMinLevel: 2
        };
        this.savedJobs = new Set();
        this.activeFilters = {
            departments: new Set(),
            levels: new Set(),
            search: ''
        };

        this.departments = ["Mathematics", "Statistics", "Computer Science", "Information Technology", "Physics", "Chemistry", "Biology", "Engineering", "Economics", "Management"];
        this.levels = ["Assistant Professor", "Associate Professor", "Professor", "Lecturer", "Research Scientist", "Postdoc"];

        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        this.loadData();
        this.setupEventListeners();
        this.renderFilters();
        this.renderJobs();
        this.checkAuthState();
        console.log('Faculty Jobs App initialized');
    }

    // Data Management
    loadData() {
        // Load from localStorage or use default data
        const savedJobs = localStorage.getItem('facultyJobs_jobs');
        const savedUsers = localStorage.getItem('facultyJobs_users');
        const savedConfig = localStorage.getItem('facultyJobs_config');
        const savedUser = localStorage.getItem('facultyJobs_currentUser');
        const savedJobsSet = localStorage.getItem('facultyJobs_savedJobs');

        if (savedJobs) {
            this.jobs = JSON.parse(savedJobs);
        } else {
            // Initialize with sample data
            this.jobs = [
                {
                    id: 'job1',
                    title: 'Assistant Professor – Mathematics',
                    institution: 'IIT Patna',
                    location: 'Patna, Bihar, India',
                    departments: ['Mathematics', 'Statistics'],
                    levels: ['Assistant Professor'],
                    description: 'Teach UG/PG, guide projects, contribute to research in control theory. We are looking for candidates with strong background in mathematics and statistics.',
                    applicationLink: 'https://example.com/apply',
                    deadline: new Date('2025-09-25'),
                    approved: true,
                    approved_at: new Date('2025-09-13T16:45:00Z'),
                    created_by: 'employer1',
                    active: true,
                    archived: false,
                    created_at: new Date('2025-09-10')
                },
                {
                    id: 'job2',
                    title: 'Professor – Computer Science',
                    institution: 'BITS Pilani',
                    location: 'Pilani, Rajasthan, India',
                    departments: ['Computer Science', 'Information Technology'],
                    levels: ['Professor'],
                    description: 'Lead research in AI/ML, mentor PhD students, teach advanced courses. Looking for experienced faculty with publications in top-tier venues.',
                    applicationLink: 'https://example.com/apply2',
                    deadline: new Date('2025-10-15'),
                    approved: false,
                    approved_at: null,
                    created_by: 'employer2',
                    active: true,
                    archived: false,
                    created_at: new Date('2025-09-12')
                },
                {
                    id: 'job3',
                    title: 'Associate Professor – Physics',
                    institution: 'NIT Trichy',
                    location: 'Tiruchirappalli, Tamil Nadu, India',
                    departments: ['Physics'],
                    levels: ['Associate Professor'],
                    description: 'Research in quantum physics and condensed matter. Strong publication record required.',
                    applicationLink: 'https://example.com/apply3',
                    deadline: new Date('2025-08-30'),
                    approved: true,
                    approved_at: new Date('2025-08-15'),
                    created_by: 'employer3',
                    active: true,
                    archived: true,
                    created_at: new Date('2025-08-01')
                }
            ];
        }

        if (savedUsers) {
            this.users = JSON.parse(savedUsers);
        } else {
            this.users = [
                {
                    uid: 'admin1',
                    email: 'admin@facultyjobs.com',
                    displayName: 'Admin User',
                    role: 'admin',
                    verifiedEmail: true,
                    trust_level: 5,
                    created_at: new Date('2025-01-01')
                },
                {
                    uid: 'employer1',
                    email: 'employer@iitpatna.ac.in',
                    displayName: 'IIT Patna HR',
                    role: 'employer',
                    orgName: 'IIT Patna',
                    verifiedEmail: true,
                    trust_level: 3,
                    created_at: new Date('2025-01-15')
                }
            ];
        }

        if (savedConfig) {
            this.appConfig = JSON.parse(savedConfig);
        }

        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
        }

        if (savedJobsSet) {
            this.savedJobs = new Set(JSON.parse(savedJobsSet));
        }
    }

    saveData() {
        localStorage.setItem('facultyJobs_jobs', JSON.stringify(this.jobs));
        localStorage.setItem('facultyJobs_users', JSON.stringify(this.users));
        localStorage.setItem('facultyJobs_config', JSON.stringify(this.appConfig));
        localStorage.setItem('facultyJobs_currentUser', JSON.stringify(this.currentUser));
        localStorage.setItem('facultyJobs_savedJobs', JSON.stringify([...this.savedJobs]));
    }

    // Event Listeners
    setupEventListeners() {
        console.log('Setting up event listeners');
        
        // Navigation buttons
        this.setupNavigationListeners();
        
        // Auth form listeners
        this.setupAuthListeners();

        // Search and filter listeners
        this.setupSearchAndFilterListeners();

        // Job posting listeners
        this.setupJobPostingListeners();

        // Admin listeners
        this.setupAdminListeners();

        // Modal listeners
        this.setupModalListeners();
    }

    setupNavigationListeners() {
        const loginBtn = document.getElementById('loginBtn');
        const registerBtn = document.getElementById('registerBtn');
        const postJobBtn = document.getElementById('postJobBtn');
        const adminBtn = document.getElementById('adminBtn');
        const logoutBtn = document.getElementById('logoutBtn');

        if (loginBtn) {
            loginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Login button clicked');
                this.showView('auth');
                this.showAuthForm('login');
            });
        }

        if (registerBtn) {
            registerBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Register button clicked');
                this.showView('auth');
                this.showAuthForm('register');
            });
        }

        if (postJobBtn) {
            postJobBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showView('postJob');
            });
        }

        if (adminBtn) {
            adminBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showView('admin');
            });
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }
    }

    setupAuthListeners() {
        // Auth form navigation
        const switchToRegister = document.getElementById('switchToRegister');
        const switchToLogin = document.getElementById('switchToLogin');
        const forgotPasswordLink = document.getElementById('forgotPasswordLink');
        const backToLogin = document.getElementById('backToLogin');

        if (switchToRegister) {
            switchToRegister.addEventListener('click', (e) => {
                e.preventDefault();
                this.showAuthForm('register');
            });
        }

        if (switchToLogin) {
            switchToLogin.addEventListener('click', (e) => {
                e.preventDefault();
                this.showAuthForm('login');
            });
        }

        if (forgotPasswordLink) {
            forgotPasswordLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.showAuthForm('forgotPassword');
            });
        }

        if (backToLogin) {
            backToLogin.addEventListener('click', (e) => {
                e.preventDefault();
                this.showAuthForm('login');
            });
        }

        // Role selection
        const roleSelect = document.getElementById('roleSelect');
        if (roleSelect) {
            roleSelect.addEventListener('change', (e) => {
                const orgNameGroup = document.getElementById('orgNameGroup');
                const orgNameInput = document.getElementById('orgNameInput');
                if (e.target.value === 'employer') {
                    orgNameGroup.classList.remove('hidden');
                    orgNameInput.required = true;
                } else {
                    orgNameGroup.classList.add('hidden');
                    orgNameInput.required = false;
                }
            });
        }

        // Form submissions
        const loginForm = document.getElementById('loginFormElement');
        const registerForm = document.getElementById('registerFormElement');
        const forgotPasswordForm = document.getElementById('forgotPasswordFormElement');

        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin(e);
            });
        }

        if (registerForm) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleRegister(e);
            });
        }

        if (forgotPasswordForm) {
            forgotPasswordForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleForgotPassword(e);
            });
        }
    }

    setupSearchAndFilterListeners() {
        // Search functionality
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                console.log('Search input:', e.target.value);
                this.activeFilters.search = e.target.value.toLowerCase();
                this.renderJobs();
            });
        }

        // Clear filters
        const clearFiltersBtn = document.getElementById('clearFiltersBtn');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.clearAllFilters();
            });
        }
    }

    setupJobPostingListeners() {
        const nextStepBtn = document.getElementById('nextStepBtn');
        const prevStepBtn = document.getElementById('prevStepBtn');
        const submitJobBtn = document.getElementById('submitJobBtn');

        if (nextStepBtn) nextStepBtn.addEventListener('click', () => this.nextStep());
        if (prevStepBtn) prevStepBtn.addEventListener('click', () => this.prevStep());
        if (submitJobBtn) submitJobBtn.addEventListener('click', () => this.submitJob());
    }

    setupAdminListeners() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showAdminTab(e.target.dataset.tab);
            });
        });

        const saveConfigBtn = document.getElementById('saveConfigBtn');
        if (saveConfigBtn) {
            saveConfigBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.saveConfig();
            });
        }
    }

    setupModalListeners() {
        const closeModal = document.getElementById('closeModal');
        const modalOverlay = document.querySelector('.modal-overlay');
        
        if (closeModal) {
            closeModal.addEventListener('click', (e) => {
                e.preventDefault();
                this.closeModal();
            });
        }

        if (modalOverlay) {
            modalOverlay.addEventListener('click', (e) => {
                e.preventDefault();
                this.closeModal();
            });
        }

        // Modal action buttons
        const shareJobBtn = document.getElementById('shareJobBtn');
        const saveJobBtn = document.getElementById('saveJobBtn');
        const applyJobBtn = document.getElementById('applyJobBtn');

        if (shareJobBtn) {
            shareJobBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.shareJob();
            });
        }

        if (saveJobBtn) {
            saveJobBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleSaveJobFromModal(e);
            });
        }

        if (applyJobBtn) {
            applyJobBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.applyToJob();
            });
        }
    }

    // Authentication
    async handleLogin(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const email = formData.get('email');
        const password = formData.get('password');

        console.log('Login attempt:', email);

        // Simulate authentication - any password works for demo
        const user = this.users.find(u => u.email === email);
        if (user) {
            this.currentUser = user;
            this.saveData();
            this.showToast('Login successful!', 'success');
            this.updateAuthState();
            this.showView('homepage');
        } else {
            this.showToast('User not found. Try admin@facultyjobs.com', 'error');
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const email = formData.get('email');
        const password = formData.get('password');
        const displayName = formData.get('displayName') || formData.get('name');
        const role = formData.get('role') || document.getElementById('roleSelect').value;
        const orgName = document.getElementById('orgNameInput').value;

        // Check if user already exists
        if (this.users.find(u => u.email === email)) {
            this.showToast('User already exists', 'error');
            return;
        }

        // Create new user
        const newUser = {
            uid: 'user_' + Date.now(),
            email,
            displayName,
            role,
            orgName: role === 'employer' ? orgName : null,
            verifiedEmail: true,
            trust_level: role === 'employer' ? 1 : 0,
            created_at: new Date()
        };

        this.users.push(newUser);
        this.currentUser = newUser;
        this.saveData();
        
        this.showToast('Registration successful! Email verified.', 'success');
        this.updateAuthState();
        this.showView('homepage');
    }

    async handleForgotPassword(e) {
        e.preventDefault();
        this.showToast('Password reset link sent to your email', 'success');
        this.showAuthForm('login');
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('facultyJobs_currentUser');
        this.updateAuthState();
        this.showView('homepage');
        this.showToast('Logged out successfully', 'success');
    }

    checkAuthState() {
        this.updateAuthState();
    }

    updateAuthState() {
        const loginBtn = document.getElementById('loginBtn');
        const registerBtn = document.getElementById('registerBtn');
        const postJobBtn = document.getElementById('postJobBtn');
        const adminBtn = document.getElementById('adminBtn');
        const logoutBtn = document.getElementById('logoutBtn');

        if (this.currentUser) {
            if (loginBtn) loginBtn.classList.add('hidden');
            if (registerBtn) registerBtn.classList.add('hidden');
            if (logoutBtn) logoutBtn.classList.remove('hidden');

            if (this.currentUser.role === 'employer' && postJobBtn) {
                postJobBtn.classList.remove('hidden');
            }

            if (this.currentUser.role === 'admin' && adminBtn) {
                adminBtn.classList.remove('hidden');
            }

            // Update empty state message
            const emptyMessage = document.getElementById('emptyStateMessage');
            if (emptyMessage) {
                if (this.currentUser.role === 'employer') {
                    emptyMessage.textContent = 'Be the first to post a job.';
                } else {
                    emptyMessage.textContent = 'No matches—try clearing filters.';
                }
            }
        } else {
            if (loginBtn) loginBtn.classList.remove('hidden');
            if (registerBtn) registerBtn.classList.remove('hidden');
            if (postJobBtn) postJobBtn.classList.add('hidden');
            if (adminBtn) adminBtn.classList.add('hidden');
            if (logoutBtn) logoutBtn.classList.add('hidden');
        }
    }

    // View Management
    showView(viewName) {
        console.log('Showing view:', viewName);
        
        // Hide all views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.add('hidden');
        });

        // Show selected view
        const viewElement = document.getElementById(viewName + 'View');
        if (viewElement) {
            viewElement.classList.remove('hidden');
            this.currentView = viewName;

            // Update page title
            const titles = {
                homepage: 'Faculty Jobs • Neo',
                auth: 'Login - Faculty Jobs • Neo',
                postJob: 'Post a Job - Faculty Jobs • Neo',
                admin: 'Admin Dashboard - Faculty Jobs • Neo'
            };
            document.title = titles[viewName] || 'Faculty Jobs • Neo';
        }
    }

    showAuthForm(formName) {
        console.log('Showing auth form:', formName);
        
        document.querySelectorAll('.auth-form').forEach(form => {
            form.classList.add('hidden');
        });

        const formElement = document.getElementById(formName + 'Form');
        if (formElement) {
            formElement.classList.remove('hidden');
        }
    }

    // Job Rendering
    renderJobs() {
        const openPositions = document.getElementById('openPositions');
        const closingSoon = document.getElementById('closingSoon');
        const archivedJobs = document.getElementById('archivedJobs');
        const openPositionsEmpty = document.getElementById('openPositionsEmpty');

        if (!openPositions) return;

        // Clear existing content
        openPositions.innerHTML = '';
        if (closingSoon) closingSoon.innerHTML = '';
        if (archivedJobs) archivedJobs.innerHTML = '';

        // Filter jobs
        const filteredJobs = this.filterJobs();
        console.log('Filtered jobs:', filteredJobs.length);

        // Categorize jobs
        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));

        const open = filteredJobs.filter(job => 
            job.approved && !job.archived && job.active !== false
        ).sort((a, b) => new Date(b.approved_at) - new Date(a.approved_at));

        const closing = filteredJobs.filter(job => 
            job.approved && !job.archived && job.active !== false && 
            new Date(job.deadline) <= thirtyDaysFromNow
        ).sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

        const archived = filteredJobs.filter(job => 
            job.archived || new Date(job.deadline) < now
        ).sort((a, b) => new Date(b.approved_at || b.created_at) - new Date(a.approved_at || a.created_at));

        // Render job cards
        if (open.length === 0) {
            if (openPositionsEmpty) openPositionsEmpty.classList.remove('hidden');
        } else {
            if (openPositionsEmpty) openPositionsEmpty.classList.add('hidden');
            open.forEach(job => {
                openPositions.appendChild(this.createJobCard(job));
            });
        }

        if (closingSoon) {
            closing.forEach(job => {
                closingSoon.appendChild(this.createJobCard(job));
            });
        }

        if (archivedJobs) {
            archived.forEach(job => {
                archivedJobs.appendChild(this.createJobCard(job));
            });
        }
    }

    filterJobs() {
        return this.jobs.filter(job => {
            // Search filter
            if (this.activeFilters.search) {
                const searchTerm = this.activeFilters.search;
                const searchableText = `${job.title} ${job.institution} ${job.location} ${job.departments.join(' ')}`.toLowerCase();
                if (!searchableText.includes(searchTerm)) {
                    return false;
                }
            }

            // Department filter
            if (this.activeFilters.departments.size > 0) {
                const hasMatchingDepartment = job.departments.some(dept => 
                    this.activeFilters.departments.has(dept)
                );
                if (!hasMatchingDepartment) {
                    return false;
                }
            }

            // Level filter
            if (this.activeFilters.levels.size > 0) {
                const hasMatchingLevel = job.levels.some(level => 
                    this.activeFilters.levels.has(level)
                );
                if (!hasMatchingLevel) {
                    return false;
                }
            }

            return true;
        });
    }

    createJobCard(job) {
        const card = document.createElement('div');
        card.className = 'job-card';
        card.dataset.jobId = job.id;

        const deadline = this.formatDate(job.deadline);
        const description = job.description.length > 140 ? 
            job.description.substring(0, 140) + '...' : 
            job.description;

        const isSaved = this.savedJobs.has(job.id);

        card.innerHTML = `
            <div class="job-card-title">${job.title}</div>
            <div class="job-card-institution">${job.institution} • ${job.location}</div>
            ${job.approved ? '<div class="job-card-status">Approved</div>' : ''}
            <div class="job-card-chips">
                ${job.departments.map(dept => `<span class="job-chip job-chip--department">${dept}</span>`).join('')}
                ${job.levels.map(level => `<span class="job-chip job-chip--level">${level}</span>`).join('')}
            </div>
            <div class="job-card-description">${description}</div>
            <div class="job-card-deadline">${deadline}</div>
            <div class="job-card-actions">
                <button class="btn btn--primary btn--sm" onclick="window.open('${job.applicationLink}', '_blank')">Apply</button>
                <button class="btn btn--outline btn--sm" onclick="app.showJobDetails('${job.id}')">Details</button>
                <button class="btn btn--secondary btn--sm ${isSaved ? 'saved' : ''}" onclick="app.toggleSaveJob(event, '${job.id}')">${isSaved ? 'Saved' : 'Save'}</button>
            </div>
        `;

        return card;
    }

    formatDate(date) {
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    }

    // Filters
    renderFilters() {
        const departmentFilters = document.getElementById('departmentFilters');
        const levelFilters = document.getElementById('levelFilters');

        if (!departmentFilters || !levelFilters) return;

        departmentFilters.innerHTML = '';
        levelFilters.innerHTML = '';

        this.departments.forEach(dept => {
            const chip = document.createElement('button');
            chip.className = 'filter-chip';
            chip.textContent = dept;
            chip.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleFilter('departments', dept);
            });
            departmentFilters.appendChild(chip);
        });

        this.levels.forEach(level => {
            const chip = document.createElement('button');
            chip.className = 'filter-chip';
            chip.textContent = level;
            chip.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleFilter('levels', level);
            });
            levelFilters.appendChild(chip);
        });
    }

    toggleFilter(filterType, value) {
        console.log('Toggling filter:', filterType, value);
        
        if (this.activeFilters[filterType].has(value)) {
            this.activeFilters[filterType].delete(value);
        } else {
            this.activeFilters[filterType].add(value);
        }

        this.updateFilterUI();
        this.renderJobs();
    }

    updateFilterUI() {
        document.querySelectorAll('.filter-chip').forEach(chip => {
            const isActive = this.activeFilters.departments.has(chip.textContent) || 
                             this.activeFilters.levels.has(chip.textContent);
            chip.classList.toggle('active', isActive);
        });
    }

    clearAllFilters() {
        console.log('Clearing all filters');
        this.activeFilters.departments.clear();
        this.activeFilters.levels.clear();
        this.activeFilters.search = '';
        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.value = '';
        this.updateFilterUI();
        this.renderJobs();
    }

    // Job Details Modal
    showJobDetails(jobId) {
        console.log('Showing job details for:', jobId);
        
        const job = this.jobs.find(j => j.id === jobId);
        if (!job) return;

        const modal = document.getElementById('jobDetailsModal');
        const modalTitle = document.getElementById('modalJobTitle');
        const modalContent = document.getElementById('modalJobContent');

        if (!modal || !modalTitle || !modalContent) return;

        modalTitle.textContent = job.title;

        const deadline = this.formatDate(job.deadline);
        const isSaved = this.savedJobs.has(job.id);

        modalContent.innerHTML = `
            <div class="job-details">
                <div class="job-detail-section">
                    <h4>Institution</h4>
                    <p>${job.institution}</p>
                </div>
                <div class="job-detail-section">
                    <h4>Location</h4>
                    <p>${job.location}</p>
                </div>
                <div class="job-detail-section">
                    <h4>Departments</h4>
                    <div class="job-card-chips">
                        ${job.departments.map(dept => `<span class="job-chip job-chip--department">${dept}</span>`).join('')}
                    </div>
                </div>
                <div class="job-detail-section">
                    <h4>Levels</h4>
                    <div class="job-card-chips">
                        ${job.levels.map(level => `<span class="job-chip job-chip--level">${level}</span>`).join('')}
                    </div>
                </div>
                <div class="job-detail-section">
                    <h4>Description</h4>
                    <p>${job.description}</p>
                </div>
                <div class="job-detail-section">
                    <h4>Application Deadline</h4>
                    <p>${deadline}</p>
                </div>
            </div>
        `;

        // Update modal buttons
        const saveBtn = document.getElementById('saveJobBtn');
        
        if (saveBtn) {
            saveBtn.textContent = isSaved ? 'Saved' : 'Save';
            saveBtn.className = `btn btn--secondary ${isSaved ? 'saved' : ''}`;
        }

        // Store current job id for modal actions
        modal.dataset.jobId = job.id;
        modal.classList.remove('hidden');
    }

    closeModal() {
        const modal = document.getElementById('jobDetailsModal');
        if (modal) modal.classList.add('hidden');
    }

    shareJob() {
        const modal = document.getElementById('jobDetailsModal');
        const jobId = modal.dataset.jobId;
        const url = `${window.location.origin}${window.location.pathname}#job=${jobId}`;
        
        if (navigator.clipboard) {
            navigator.clipboard.writeText(url).then(() => {
                this.showToast('Job link copied to clipboard!', 'success');
            }).catch(() => {
                this.showToast('Job link: ' + url, 'info');
            });
        } else {
            this.showToast('Job link: ' + url, 'info');
        }
    }

    toggleSaveJob(event, jobId) {
        if (event) event.stopPropagation();
        
        console.log('Toggling save for job:', jobId);
        
        if (this.savedJobs.has(jobId)) {
            this.savedJobs.delete(jobId);
            this.showToast('Job removed from saved', 'success');
        } else {
            this.savedJobs.add(jobId);
            this.showToast('Job saved!', 'success');
        }

        this.saveData();
        this.renderJobs(); // Update cards
    }

    toggleSaveJobFromModal(event) {
        const modal = document.getElementById('jobDetailsModal');
        const jobId = modal.dataset.jobId;
        this.toggleSaveJob(event, jobId);
        
        // Update modal button
        const saveBtn = document.getElementById('saveJobBtn');
        const isSaved = this.savedJobs.has(jobId);
        if (saveBtn) {
            saveBtn.textContent = isSaved ? 'Saved' : 'Save';
            saveBtn.className = `btn btn--secondary ${isSaved ? 'saved' : ''}`;
        }
    }

    applyToJob() {
        const modal = document.getElementById('jobDetailsModal');
        const jobId = modal.dataset.jobId;
        const job = this.jobs.find(j => j.id === jobId);
        
        if (job) {
            window.open(job.applicationLink, '_blank');
        }
    }

    // Job posting placeholder methods
    nextStep() {
        this.showToast('Job posting flow coming soon!', 'info');
    }

    prevStep() {
        this.showToast('Job posting flow coming soon!', 'info');
    }

    submitJob() {
        this.showToast('Job posting feature coming soon!', 'info');
    }

    // Admin placeholder methods
    showAdminTab(tabName) {
        console.log('Showing admin tab:', tabName);
        
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        document.querySelectorAll('.admin-tab').forEach(tab => {
            tab.classList.add('hidden');
        });

        const selectedTab = document.getElementById(tabName + 'Tab');
        if (selectedTab) {
            selectedTab.classList.remove('hidden');
        }
    }

    saveConfig() {
        this.showToast('Configuration saved!', 'success');
    }

    // Utility Functions
    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast--${type}`;
        toast.textContent = message;

        container.appendChild(toast);

        // Auto remove after 4 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 4000);
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// Initialize the application
const app = new FacultyJobsApp();

// Make app globally available for onclick handlers
window.app = app;