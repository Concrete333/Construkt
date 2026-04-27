const store = {
      currentRole: 'finance_director',
      currentUser: {
        name: 'Maya Shah',
        initials: 'MS',
        org: 'Northstar Capital Controls',
      },
      activeProjectId: null,
      activePackageId: null,
      activeRequestId: null,
      projects: [
        {
          id: 'proj-001',
          name: 'Demo Hospital Fit-Out',
          client: 'Northstar Health Trust',
          status: 'Active',
          contractModel: 'milestone',
          contractRef: 'MH-402A',
          startDate: '2026-02-12',
          endDate: '2027-08-01',
          team: [
            { name: 'Maya Shah', role: 'finance_director', org: 'Northstar Capital' },
            { name: 'Eleanor Lane', role: 'project_manager', org: 'Construct PM Ltd' },
            { name: 'Daniel Okafor', role: 'contractor', org: 'Okafor Builders Ltd' },
          ],
          packages: [
            {
              id: 'wp-001',
              name: 'Foundation Pour — Bay A',
              cap: 640000,
              funded: 410000,
              released: 128000,
              status: 'Partially Funded',
              contractor: 'Daniel Okafor',
              requests: [
                {
                  id: 'req-001',
                  ref: 'INV-FND-001',
                  amount: 92400,
                  submittedBy: 'Daniel Okafor',
                  date: '2026-04-08',
                  status: 'Released',
                  pmApproved: true,
                  pmApprovedBy: 'Eleanor Lane',
                  pmApprovedDate: '2026-04-09',
                  fdApproved: true,
                  fdApprovedBy: 'Maya Shah',
                  fdApprovedDate: '2026-04-10',
                  documents: ['doc-001', 'doc-002'],
                },
              ],
            },
            {
              id: 'wp-002',
              name: 'Steel Frame Section B',
              cap: 920000,
              funded: 920000,
              released: 244000,
              status: 'Funded',
              contractor: 'Northline Structures',
              requests: [],
            },
            {
              id: 'wp-003',
              name: 'MEP First Fix',
              cap: 780000,
              funded: 560000,
              released: 210000,
              status: 'Partially Funded',
              contractor: 'Daniel Okafor',
              requests: [],
            },
            {
              id: 'wp-004',
              name: 'Facade Remediation',
              cap: 1100000,
              funded: 620000,
              released: 388000,
              status: 'Locked',
              contractor: 'Northline Structures',
              requests: [],
            },
            {
              id: 'wp-005',
              name: 'Interior Fit-Out',
              cap: 810000,
              funded: 300000,
              released: 200000,
              status: 'Pending',
              contractor: 'Daniel Okafor',
              requests: [],
            },
          ],
          milestones: [
            {
              id: 'ms-001',
              name: 'Foundation & Groundworks',
              targetDate: '2026-05-01',
              status: 'in-progress',
              packageIds: ['wp-001'],
            },
            {
              id: 'ms-002',
              name: 'Structural Frame',
              targetDate: '2026-09-01',
              status: 'upcoming',
              packageIds: ['wp-002', 'wp-003'],
            },
            {
              id: 'ms-003',
              name: 'Facade & Envelope',
              targetDate: '2027-02-01',
              status: 'upcoming',
              packageIds: ['wp-004'],
            },
            {
              id: 'ms-004',
              name: 'Fit-Out & Handover',
              targetDate: '2027-08-01',
              status: 'upcoming',
              packageIds: ['wp-005'],
            },
          ],
          auditLog: [
            { event: 'Steel frame payment released', actor: 'Maya Shah', date: '2026-04-14T10:42:00', type: 'released' },
            { event: 'Foundation invoice awaiting PM review', actor: 'Okafor Builders Ltd', date: '2026-04-14T09:18:00', type: 'pending' },
            { event: 'Facade variation request rejected', actor: 'Eleanor Lane', date: '2026-04-12T11:27:00', type: 'rejected' },
            { event: 'MEP package funded', actor: 'Maya Shah', date: '2026-04-11T15:52:00', type: 'released' },
          ],
        },
        {
          id: 'proj-002',
          name: 'Civic Library Retrofit',
          client: 'City Council',
          status: 'Active',
          contractModel: 'valuation',
          contractRef: 'CLR-201',
          startDate: '2026-01-10',
          endDate: '2027-03-01',
          team: [],
          packages: [],
          milestones: [],
          auditLog: [],
        },
        {
          id: 'proj-003',
          name: 'Station Works',
          client: 'Network Rail',
          status: 'Active',
          contractModel: 'bespoke',
          contractRef: 'SW-088',
          startDate: '2025-11-01',
          endDate: '2026-12-01',
          team: [],
          packages: [],
          milestones: [],
          auditLog: [],
        },
      ],
      documents: [
        {
          id: 'doc-001',
          name: 'Foundation Pour Certificate',
          type: 'Certificate',
          ref: 'DOC-FND-014',
          uploadedBy: 'D. Okafor',
          date: '2026-04-11',
          version: 3,
          linkedPayment: 'req-001',
          projectId: 'proj-001',
          packageId: 'wp-001',
        },
        {
          id: 'doc-002',
          name: 'Approved Payment Notice',
          type: 'Payment Notice',
          ref: 'DOC-PAY-008',
          uploadedBy: 'M. Shah',
          date: '2026-04-08',
          version: 2,
          linkedPayment: 'req-001',
          projectId: 'proj-001',
          packageId: 'wp-001',
        },
        {
          id: 'doc-003',
          name: 'Site Inspection Photo Set',
          type: 'Photo Evidence',
          ref: 'DOC-PHO-031',
          uploadedBy: 'E. Lane',
          date: '2026-04-09',
          version: 1,
          linkedPayment: null,
          projectId: 'proj-001',
          packageId: null,
        },
      ],
    };

    function getProjectTotals(project) {
      const contractValue = project.packages.reduce((s, p) => s + p.cap, 0);
      const escrowFunded = project.packages.reduce((s, p) => s + p.funded, 0);
      const totalReleased = project.packages.reduce((s, p) => s + p.released, 0);
      return {
        contractValue,
        escrowFunded,
        totalReleased,
        remaining: contractValue - totalReleased,
      };
    }

    function formatGBP(n) {
      if (n >= 1000000) return '£' + (n / 1000000).toFixed(2) + 'm';
      if (n >= 1000) return '£' + (n / 1000).toFixed(0) + 'k';
      return '£' + n.toLocaleString();
    }

    function logAudit(project, event, type) {
      project.auditLog.unshift({
        event,
        type,
        actor: store.currentUser.name,
        date: new Date().toISOString(),
      });
    }

    const routes = {
      home: { layout: 'public', page: 'home' },
      signin: { layout: 'public', page: 'signin' },
      dashboard: { layout: 'app', page: 'dashboard' },
      dashboard2: { layout: 'app', page: 'dashboard2' },
      'chart-fullscreen': { layout: 'app', page: 'chart-fullscreen', nav: 'dashboard2' },
      'upload-task': { layout: 'app', page: 'upload-task', nav: 'dashboard2' },
      projects: { layout: 'app', page: 'projects' },
      'project-detail': { layout: 'app', page: 'project-detail', nav: 'projects' },
      'work-package-detail': { layout: 'app', page: 'work-package-detail', nav: 'projects' },
      settings: { layout: 'app', page: 'settings' }
    };

    const roles = [
      {
        label: 'Finance Director',
        initials: 'FD',
        name: 'Maya',
        org: 'Northstar Capital Controls',
        context: 'Review release-ready packages and escrow positions across active projects.',
        kpis: {
          contract: '£3.8m',
          contractNote: 'Across 4 active work packages',
          escrow: '£2.6m',
          escrowNote: '68% of contract value funded',
          released: '£0',
          releasedNote: 'Finance does not receive package releases'
        }
      },
      {
        label: 'Project Manager',
        initials: 'PM',
        name: 'Eleanor',
        org: 'Demo Hospital Fit-Out',
        context: 'Check submitted requests, document references, and approval readiness.',
        kpis: {
          contract: '£1.9m',
          contractNote: 'Packages under PM review',
          escrow: '£1.2m',
          escrowNote: 'Available across assigned packages',
          released: '£312k',
          releasedNote: 'Released after PM approval'
        }
      },
      {
        label: 'Contractor',
        initials: 'CO',
        name: 'Maya',
        org: 'Okafor Builders Ltd.',
        context: 'Track submitted invoices, approval progress, and payment releases for your assigned packages.',
        kpis: {
          contract: '£640k',
          contractNote: 'Value assigned to Okafor Builders',
          escrow: '£410k',
          escrowNote: 'Locked against current milestones',
          released: '£128k',
          releasedNote: 'Paid across completed packages'
        }
      }
    ];

    let roleIndex = 0;
    let currentRole = 'finance_director';

    function applyInitialTheme() {
      const storedTheme = localStorage.getItem('construkt-theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.dataset.theme = storedTheme || (prefersDark ? 'dark' : 'light');
    }

    function currentRoute() {
      const hash = window.location.hash.replace('#', '') || 'home';
      return routes[hash] ? hash : 'home';
    }

    function renderRoute() {
      const name = currentRoute();
      const route = routes[name];
      const publicScreen = document.getElementById('public-screen');
      const appScreen = document.getElementById('app-screen');

      publicScreen.classList.toggle('is-active', route.layout === 'public');
      appScreen.classList.toggle('is-active', route.layout === 'app');

      document.getElementById('home-page').hidden = route.page !== 'home';
      document.getElementById('signin-page').hidden = route.page !== 'signin';

      document.querySelectorAll('[data-app-page]').forEach((page) => {
        page.hidden = page.dataset.appPage !== route.page;
      });

      document.querySelectorAll('[data-route-link]').forEach((link) => {
        link.classList.toggle('is-active', link.dataset.routeLink === (route.nav || route.page));
      });

      if (name === 'dashboard') {
        renderDashboard();
        maybeAnimateDashboardKpis();
      }
      if (name === 'dashboard2') {
        renderDashboard2();
      }
      if (name === 'chart-fullscreen') {
        renderChartFullscreen();
      }
      if (name === 'projects') {
        renderProjectsList();
      }
      if (name === 'project-detail') {
        renderProjectDetail(store.currentProjectId || store.projects[0].id);
        syncProjectDetailEmptyStates();
      }
      if (name === 'work-package-detail') {
        const projectId = store.currentProjectId || store.projects[0].id;
        const project = projectFor(projectId) || store.projects[0];
        renderPackageDetail(project.id, store.currentPackageId || project.packages[0]?.id);
      }
    }

    function setKpiCountText(id, text) {
      const el = document.getElementById(id);
      if (!el) return;
      const inner = el.querySelector('.kpi-count');
      if (inner) inner.textContent = text;
      else el.textContent = text;
    }

    function parseMoneyKpi(text) {
      const normalized = String(text).replace(/,/g, '').trim();
      const match = normalized.match(/£\s*([\d.]+)\s*(m|k)?/i);
      if (!match) return 0;
      let value = parseFloat(match[1]);
      if (Number.isNaN(value)) return 0;
      const suffix = (match[2] || '').toLowerCase();
      if (suffix === 'm') value *= 1000000;
      if (suffix === 'k') value *= 1000;
      return value;
    }

    function formatMoneyKpi(value) {
      const magnitude = Math.abs(value);
      if (magnitude >= 1000000) return `£${(value / 1000000).toFixed(1)}m`;
      if (magnitude >= 1000) return `£${Math.round(value / 1000)}k`;
      return `£${Math.round(value)}`;
    }

    function easeOutCubic(t) {
      return 1 - (1 - t) ** 3;
    }

    function animateDashboardKpis() {
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      ['kpi-contract', 'kpi-escrow', 'kpi-released'].forEach((id) => {
        const host = document.getElementById(id);
        const inner = host?.querySelector('.kpi-count');
        if (!host || !inner) return;
        const targetText = inner.textContent.trim();
        if (reducedMotion) {
          inner.textContent = targetText;
          return;
        }
        const endValue = parseMoneyKpi(targetText);
        const startTs = performance.now();
        const duration = 800;
        inner.textContent = formatMoneyKpi(0);
        function step(ts) {
          const progress = Math.min(1, (ts - startTs) / duration);
          const eased = easeOutCubic(progress);
          inner.textContent = formatMoneyKpi(endValue * eased);
          if (progress < 1) {
            requestAnimationFrame(step);
          } else {
            inner.textContent = targetText;
          }
        }
        requestAnimationFrame(step);
      });
    }

    function maybeAnimateDashboardKpis() {
      if (currentRoute() !== 'dashboard') return;
      requestAnimationFrame(() => animateDashboardKpis());
    }

    function syncDocumentTableEmpty() {
      const empty = document.querySelector('[data-documents-empty]');
      const wrap = document.querySelector('[data-documents-table-wrap]');
      if (!empty || !wrap) return;
      const rows = [...document.querySelectorAll('[data-document-row]')].filter((row) => !row.hidden);
      const visible = rows.length;
      empty.classList.toggle('is-visible', visible === 0);
      wrap.style.display = visible === 0 ? 'none' : '';
    }

    function syncWorkPackagesEmpty() {
      const empty = document.querySelector('[data-wp-empty]');
      const wrap = document.querySelector('[data-wp-table-wrap]');
      if (!empty || !wrap) return;
      const rows = wrap.querySelectorAll('tbody tr');
      empty.classList.toggle('is-visible', rows.length === 0);
      wrap.style.display = rows.length === 0 ? 'none' : '';
    }

    function syncAuditTrailEmpty() {
      const empty = document.querySelector('[data-audit-empty]');
      const wrap = document.querySelector('[data-audit-trail-wrap]');
      if (!empty || !wrap) return;
      const items = wrap.querySelectorAll('.timeline-list > .timeline-item');
      empty.classList.toggle('is-visible', items.length === 0);
      wrap.style.display = items.length === 0 ? 'none' : '';
    }

    function syncPaymentsTableEmpty() {
      const empty = document.querySelector('[data-payments-empty]');
      const wrap = document.querySelector('[data-payments-table-wrap]');
      if (!empty || !wrap) return;
      const rows = wrap.querySelectorAll('tbody tr.payment-row');
      empty.classList.toggle('is-visible', rows.length === 0);
      wrap.style.display = rows.length === 0 ? 'none' : '';
    }

    function syncProjectDetailEmptyStates() {
      syncWorkPackagesEmpty();
      syncAuditTrailEmpty();
      syncPaymentsTableEmpty();
      syncDocumentTableEmpty();
    }

    function roleKeyFromLabel(label) {
      if (label === 'Finance Director') return 'finance_director';
      if (label === 'Project Manager') return 'project_manager';
      return 'contractor';
    }

    function filterProjectsForRole(role) {
      const note = document.querySelector('[data-contractor-project-note]');
      document.querySelectorAll('[data-project-row]').forEach((row) => {
        const roleCell = row.children[1]?.textContent.trim().toLowerCase() || '';
        row.style.display = role === 'contractor' && roleCell !== 'contractor' ? 'none' : '';
      });
      if (note) note.hidden = role !== 'contractor';
    }

    function updatePackageApprovalFlow(role) {
      const submitted = document.querySelector('[data-flow-step="submitted"]');
      const pm = document.querySelector('[data-flow-step="pm"]');
      const finance = document.querySelector('[data-flow-step="finance"]');
      const released = document.querySelector('[data-flow-step="released"]');
      if (!submitted || !pm || !finance || !released) return;

      [submitted, pm, finance, released].forEach((step) => {
        step.classList.remove('complete', 'current', 'line-complete');
      });

      submitted.classList.add('complete', 'line-complete');
      if (role === 'finance_director') {
        pm.classList.add('complete', 'line-complete');
        finance.classList.add('current');
      } else {
        pm.classList.add('current');
      }
    }

    function applyRoleUI(role) {
      document.querySelectorAll('[data-visible-to]').forEach((element) => {
        const visibleRoles = element.dataset.visibleTo.split(/\s+/);
        element.style.display = visibleRoles.includes(role) ? '' : 'none';
      });
      filterProjectsForRole(role);
      updatePackageApprovalFlow(role);
    }

    function roleLabel(role) {
      if (role === 'finance_director') return 'Finance';
      if (role === 'project_manager') return 'PM';
      if (role === 'contractor') return 'Contractor';
      return 'Not Linked';
    }

    function roleFullLabel(role) {
      if (role === 'finance_director') return 'Finance Director';
      if (role === 'project_manager') return 'Project Manager';
      if (role === 'contractor') return 'Contractor';
      return 'Not Linked';
    }

    function initials(name) {
      return name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
    }

    function chipTone(status) {
      const value = String(status || '').toLowerCase();
      if (/(released|funded|approved|active)/.test(value)) return 'chip-tone-success';
      if (/(submitted|pending|under review)/.test(value)) return 'chip-tone-primary';
      if (/(held|partially funded|in progress)/.test(value)) return 'chip-tone-warning';
      if (/(rejected|locked|blocked)/.test(value)) return 'chip-tone-danger';
      return 'chip-tone-neutral';
    }

    function statusChip(status) {
      return `<span class="status-pill ${chipTone(status)}">${status}</span>`;
    }

    function timelineDot(type) {
      if (type === 'released') return 'green';
      if (type === 'pending') return 'yellow';
      if (type === 'rejected') return 'red';
      return '';
    }

    function formatDate(value) {
      if (!value) return '';
      return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    function formatDateTime(value) {
      if (!value) return '';
      return new Date(value).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    function modelLabel(model) {
      if (model === 'milestone') return 'Milestone';
      if (model === 'valuation') return 'Valuation';
      if (model === 'bespoke') return 'Bespoke';
      return 'Milestone';
    }

    function clampPercent(value) {
      return Math.max(0, Math.min(100, value));
    }

    function dateProgress(startDate, endDate, currentDate = new Date()) {
      const start = new Date(`${startDate}T00:00:00`).getTime();
      const end = new Date(`${endDate}T00:00:00`).getTime();
      const current = currentDate.getTime();
      if (!start || !end || end <= start) return 0;
      return clampPercent(((current - start) / (end - start)) * 100);
    }

    function timelineStatusClass(status) {
      if (status === 'complete') return 'project-phase-timeline__node--complete';
      if (status === 'in-progress') return 'project-phase-timeline__node--current';
      if (status === 'blocked') return 'project-phase-timeline__node--complete';
      return 'project-phase-timeline__node--future';
    }

    function timelineDotStyle(status) {
      if (status === 'complete') return 'style="background:var(--color-success); color:var(--color-surface-2);"';
      if (status === 'blocked') return 'style="background:var(--color-error); color:var(--color-surface-2);"';
      return '';
    }

    function timelineIcon(status) {
      if (status === 'complete') {
        return '<svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square" stroke-linejoin="miter" /></svg>';
      }
      if (status === 'blocked') {
        return '<svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="1.5" fill="none" stroke="currentColor" stroke-width="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2" /></svg>';
      }
      return '';
    }

    function buildValuationTimeline(project) {
      const nodes = [];
      const cursor = new Date(`${project.startDate}T00:00:00`);
      const end = new Date(`${project.endDate}T00:00:00`);
      let quarter = 1;
      while (cursor <= end) {
        const iso = cursor.toISOString().split('T')[0];
        nodes.push({
          name: `Quarter ${quarter}`,
          targetDate: iso,
          status: new Date() >= cursor ? 'complete' : 'upcoming',
        });
        cursor.setMonth(cursor.getMonth() + 3);
        quarter += 1;
      }
      if (!nodes.some((node) => node.targetDate === project.endDate)) {
        nodes.push({ name: 'Final Valuation', targetDate: project.endDate, status: 'upcoming' });
      }
      const firstUpcoming = nodes.find((node) => node.status === 'upcoming');
      if (firstUpcoming) firstUpcoming.status = 'in-progress';
      return nodes;
    }

    function buildBespokeTimeline(project) {
      return project.packages.map((pkg) => ({
        name: pkg.name,
        targetDate: project.endDate,
        status: pkg.status === 'Locked' ? 'blocked' : pkg.status === 'Released' ? 'complete' : pkg.requests.length ? 'in-progress' : 'upcoming',
      }));
    }

    function getTimelineNodes(project) {
      if (project.contractModel === 'milestone') {
        syncMilestoneStatuses(project);
        return project.milestones.map((milestone) => ({
          name: milestone.name,
          targetDate: milestone.targetDate,
          status: milestone.status,
        }));
      }
      if (project.contractModel === 'valuation') return buildValuationTimeline(project);
      return buildBespokeTimeline(project);
    }

    function renderTimeline(projectId) {
      const project = projectFor(projectId);
      const container = document.getElementById('project-timeline');
      if (!project || !container) return;
      const nodes = getTimelineNodes(project);
      const todayPct = dateProgress(project.startDate, project.endDate);
      const lastCompleteIndex = nodes.reduce((latest, node, index) => node.status === 'complete' ? index : latest, -1);
      const fillPct = nodes.length > 1 && lastCompleteIndex > -1 ? (lastCompleteIndex / (nodes.length - 1)) * 100 : 0;

      container.innerHTML = `
        <div class="project-phase-timeline__track" aria-hidden="true">
          <div class="project-phase-timeline__fill" style="width:${fillPct}%"></div>
          <span class="project-phase-timeline__today" style="left:${todayPct}%">Today</span>
        </div>
        <div class="project-phase-timeline__nodes" style="grid-template-columns:repeat(${Math.max(nodes.length, 1)}, minmax(0, 1fr));">
          ${nodes.map((node) => `
            <div class="project-phase-timeline__node ${timelineStatusClass(node.status)}">
              <span class="project-phase-timeline__dot" ${timelineDotStyle(node.status)} aria-hidden="true">${timelineIcon(node.status)}</span>
              <span class="project-phase-timeline__label">${node.name}</span>
              <span class="project-phase-timeline__date">${formatDate(node.targetDate)}</span>
            </div>
          `).join('')}
        </div>
      `;
    }

    function projectFor(projectId) {
      return store.projects.find((project) => project.id === projectId);
    }

    function packageFor(project, packageId) {
      return project?.packages.find((pkg) => pkg.id === packageId);
    }

    function getAllRequests(project) {
      return project.packages.flatMap((pkg) => pkg.requests.map((request) => ({ ...request, package: pkg })));
    }

    function getCurrentUserRole(project) {
      return project.team.find((member) => member.name === store.currentUser.name && member.role === store.currentRole)?.role;
    }

    function renderProjectsList() {
      const container = document.getElementById('projects-tbody');
      if (!container) return;
      const projects = store.currentRole === 'contractor'
        ? store.projects.filter((project) => project.team.some((member) => member.name === store.currentUser.name))
        : store.projects;

      container.innerHTML = projects.map((project) => {
        const role = getCurrentUserRole(project);
        const openPackages = project.packages.filter((pkg) => pkg.status !== 'Released').length;
        const requests = getAllRequests(project);
        const requestLabel = requests.length ? `${requests.length} ${requests[0].status.toLowerCase()}` : '0 requests';
        return `
          <tr class="clickable-row" data-project-row>
            <td><span class="project-name">${project.name}</span><br><span class="muted">${project.client}</span></td>
            <td>${statusChip(role ? roleLabel(role) : 'Not Linked')}</td>
            <td><span class="model-badge">${modelLabel(project.contractModel)}</span></td>
            <td>${openPackages}</td>
            <td>${requestLabel}</td>
            <td>${project.auditLog.length} events</td>
            <td><a class="text-link" href="#project-detail" onclick="showProjectDetail('${project.id}'); return false;">View →</a></td>
          </tr>
        `;
      }).join('');

      const note = document.querySelector('[data-contractor-project-note]');
      if (note) note.hidden = store.currentRole !== 'contractor';
    }

    function renderProjectDetail(projectId) {
      const project = projectFor(projectId);
      if (!project) return;
      store.currentProjectId = projectId;
      store.activeProjectId = projectId;
      const totals = getProjectTotals(project);
      const fundedPct = totals.contractValue ? Math.round((totals.escrowFunded / totals.contractValue) * 100) : 0;
      const releasedPct = totals.contractValue ? Math.round((totals.totalReleased / totals.contractValue) * 100) : 0;

      document.getElementById('project-title').textContent = project.name;
      document.querySelector('[data-project-detail-breadcrumb]').textContent = `Projects → ${project.name}`;
      document.getElementById('project-meta').innerHTML = `
        <span>${project.client}</span>
        ${statusChip(project.status)}
        <span class="model-badge">${modelLabel(project.contractModel)}</span>
        <span>Started ${formatDate(project.startDate)}</span>
      `;
      document.getElementById('project-kpis').innerHTML = `
        <article class="kpi-card"><span class="kpi-label">Contract Value</span><strong class="kpi-value">${formatGBP(totals.contractValue)}</strong><span class="kpi-note">Across ${project.packages.length} active packages</span></article>
        <article class="kpi-card"><span class="kpi-label">Escrow Funded</span><strong class="kpi-value">${formatGBP(totals.escrowFunded)}</strong><div class="kpi-progress-pct-row"><span class="kpi-progress-pct">${fundedPct}% funded</span></div><div class="kpi-progress-track" aria-hidden="true"><span class="kpi-progress-fill kpi-progress-fill--funded" style="width:${fundedPct}%"></span></div><span class="kpi-note">${fundedPct}% currently locked</span></article>
        <article class="kpi-card" data-visible-to="finance_director project_manager"><span class="kpi-label">Total Released</span><strong class="kpi-value">${formatGBP(totals.totalReleased)}</strong><div class="kpi-progress-pct-row"><span class="kpi-progress-pct">${releasedPct}% released</span></div><div class="kpi-progress-track" aria-hidden="true"><span class="kpi-progress-fill kpi-progress-fill--released" style="width:${releasedPct}%"></span></div><span class="kpi-note">Paid against approved work</span></article>
        <article class="kpi-card"><span class="kpi-label">Remaining</span><strong class="kpi-value">${formatGBP(totals.remaining)}</strong><span class="kpi-note">Contract value less released</span></article>
      `;

      const modelColumn = project.contractModel === 'valuation' ? 'Valuation Period' : project.contractModel === 'bespoke' ? 'Release Trigger' : 'Milestone Stage';
      const modelValues = project.contractModel === 'valuation'
        ? ['Month 3', 'Month 4', 'Month 4', 'Month 5', 'Month 5']
        : project.contractModel === 'bespoke'
          ? ['Manual', 'On PM approval', 'Manual', 'Director sign-off', 'Manual']
          : ['Stage 1 of 3', 'Stage 2 of 3', 'Stage 2 of 3', 'Stage 3 of 3', 'Stage 3 of 3'];
      const modelHeader = document.querySelector('[data-model-column-label]');
      if (modelHeader) modelHeader.textContent = modelColumn;
      const packageRow = (pkg, index) => `
        <tr>
          <td>${pkg.name}</td>
          <td>${formatGBP(pkg.cap)}</td>
          <td>${modelValues[index] || modelValues[0] || '—'}</td>
          <td>${formatGBP(pkg.funded)}</td>
          <td>${formatGBP(pkg.released)}</td>
          <td>${pkg.requests.length ? `${pkg.requests.length} ${pkg.requests[pkg.requests.length - 1].status.toLowerCase()}` : '0 open'}</td>
          <td>${statusChip(pkg.status)}</td>
          <td><a class="text-link" href="#work-package-detail" onclick="showPackageDetail('${project.id}', '${pkg.id}'); return false;">View</a></td>
        </tr>
      `;

      if (project.contractModel === 'milestone' && project.milestones?.length) {
        const assignedPackageIds = new Set(project.milestones.flatMap((milestone) => milestone.packageIds));
        const groupedRows = project.milestones.map((milestone) => {
          const packages = milestone.packageIds.map((id) => packageFor(project, id)).filter(Boolean);
          return `
            <tr>
              <td colspan="8" style="background:var(--color-surface-offset, var(--color-surface)); color:var(--color-text-faint); font-size:var(--text-xs); font-weight:500; text-transform:uppercase; letter-spacing:0.08em;">
                ${milestone.name} · ${formatDate(milestone.targetDate)} · ${statusChip(milestone.status)}
              </td>
            </tr>
            ${packages.map((pkg) => packageRow(pkg, project.packages.indexOf(pkg))).join('')}
          `;
        }).join('');
        const unassignedPackages = project.packages.filter((pkg) => !assignedPackageIds.has(pkg.id));
        const unassignedRows = unassignedPackages.length ? `
          <tr>
            <td colspan="8" style="background:var(--color-surface-offset, var(--color-surface)); color:var(--color-text-faint); font-size:var(--text-xs); font-weight:500; text-transform:uppercase; letter-spacing:0.08em;">
              Unassigned · No target date · ${statusChip('Pending')}
            </td>
          </tr>
          ${unassignedPackages.map((pkg) => packageRow(pkg, project.packages.indexOf(pkg))).join('')}
        ` : '';
        document.getElementById('packages-tbody').innerHTML = groupedRows + unassignedRows;
      } else {
        document.getElementById('packages-tbody').innerHTML = project.packages.map((pkg, index) => packageRow(pkg, index)).join('');
      }

      document.getElementById('team-list').innerHTML = project.team.map((member) => `
        <div class="team-row">
          <span class="approver-avatar">${initials(member.name)}</span>
          <strong>${member.name}</strong>
          ${statusChip(roleLabel(member.role))}
        </div>
      `).join('');

      document.getElementById('audit-list').innerHTML = project.auditLog.map((item) => `
        <li class="timeline-item">
          <span class="timeline-dot ${timelineDot(item.type)}"></span>
          <div><span class="timeline-title">${item.event}</span><span class="timeline-meta">${item.actor} · ${formatDateTime(item.date)}</span></div>
        </li>
      `).join('');

      renderTimeline(projectId);
      renderDocuments(projectId);
      renderPayments(projectId);
      applyRoleUI(store.currentRole);
      syncProjectDetailEmptyStates();
    }

    function renderPackageDetail(projectId, packageId) {
      const project = projectFor(projectId);
      const pkg = packageFor(project, packageId);
      if (!project || !pkg) return;
      store.currentProjectId = projectId;
      store.currentPackageId = packageId;
      store.activeProjectId = projectId;
      store.activePackageId = packageId;
      const request = pkg.requests[pkg.requests.length - 1] || null;
      store.activeRequestId = request?.id || null;
      const docs = store.documents.filter((doc) => doc.projectId === projectId && doc.packageId === packageId);
      const packageAudit = project.auditLog.filter((item) => item.event.includes(pkg.name) || item.event.toLowerCase().includes(pkg.name.split(' ')[0].toLowerCase()));

      document.getElementById('package-title').innerHTML = `${pkg.name} ${statusChip(pkg.status)}`;
      const packageBack = document.querySelector('[data-package-back]');
      if (packageBack) {
        packageBack.querySelector('span').textContent = `Back to ${project.name}`;
        packageBack.onclick = () => showProjectDetail(project.id);
      }
      document.querySelector('#work-package-detail-page .back-link').textContent = `Projects → ${project.name} → ${pkg.name}`;
      document.querySelector('#work-package-detail-page .back-link').setAttribute('onclick', `showProjectDetail('${projectId}'); return false;`);
      document.querySelector('[data-package-contract-context]').textContent = `Contract type: ${modelLabel(project.contractModel)} · ${project.contractRef}`;
      document.getElementById('package-kpis').innerHTML = `
        <article class="kpi-card"><span class="kpi-label">Cap</span><strong class="kpi-value">${formatGBP(pkg.cap)}</strong><span class="kpi-note">Approved package ceiling</span></article>
        <article class="kpi-card"><span class="kpi-label">Funded</span><strong class="kpi-value">${formatGBP(pkg.funded)}</strong><span class="kpi-note">Locked for this package</span></article>
        <article class="kpi-card"><span class="kpi-label">Released</span><strong class="kpi-value">${formatGBP(pkg.released)}</strong><span class="kpi-note">Paid to contractor</span></article>
        <article class="kpi-card"><span class="kpi-label">Remaining</span><strong class="kpi-value">${formatGBP(pkg.cap - pkg.released)}</strong><span class="kpi-note">Cap less released</span></article>
      `;

      document.getElementById('package-request').innerHTML = request ? `
        <div class="request-head"><span class="assignment-meta">Current Request</span><div class="chip-row"><span class="assignment-chip">${request.ref}</span><span class="assignment-chip">${formatDate(request.date)}</span></div></div>
        <h2 class="request-title">${request.ref}</h2>
        <strong class="request-amount">${formatGBP(request.amount)}</strong>
        <span class="assignment-meta">Submitted by ${request.submittedBy}</span>
        <p class="assignment-description">${statusChip(request.status)}</p>
      ` : `
        <div class="records-empty is-visible"><h3 class="records-empty__title">No invoice submitted yet</h3><p class="records-empty__body">Payment requests for this work package will appear here.</p></div>
      `;

      document.getElementById('package-approval').innerHTML = request ? `
        <div class="card-head"><h2>Approval Progress</h2></div>
        <div class="approval-flow">
          <div class="flow-step complete line-complete"><span class="flow-dot"></span><span class="flow-label">Submitted</span><span class="flow-meta">${request.submittedBy} · ${formatDate(request.date)}</span></div>
          <div class="flow-step ${request.pmApproved ? 'complete line-complete' : 'current'}"><span class="flow-dot"></span><span class="flow-label">PM Review</span><span class="flow-meta">${request.pmApproved ? `${request.pmApprovedBy} · ${formatDate(request.pmApprovedDate)}` : 'Pending'}</span></div>
          <div class="flow-step ${request.fdApproved ? 'complete line-complete' : request.pmApproved ? 'current' : ''}"><span class="flow-dot"></span><span class="flow-label">Finance Review</span><span class="flow-meta">${request.fdApproved ? `${request.fdApprovedBy} · ${formatDate(request.fdApprovedDate)}` : 'Pending'}</span></div>
          <div class="flow-step ${request.status === 'Released' ? 'complete' : ''}"><span class="flow-dot"></span><span class="flow-label">Released</span><span class="flow-meta">${request.status}</span></div>
        </div>
      ` : `<div class="card-head"><h2>Approval Progress</h2></div><p class="assignment-description">Approval flow starts after an invoice is submitted.</p>`;

      document.getElementById('package-docs').innerHTML = `
        <div class="card-head"><h2>Supporting Documents</h2><button class="btn btn-primary small" data-visible-to="finance_director project_manager contractor" data-modal-target="add-document" data-document-scope="package" type="button">Add document</button></div>
        ${docs.length ? `<div class="table-card"><table class="action-table"><thead><tr><th>Document</th><th>Type</th><th>Ref</th><th>Version</th><th>Chain</th></tr></thead><tbody>${docs.map((doc) => `<tr><td><a class="document-link" href="#">${doc.name}</a></td><td>${doc.type}</td><td>${doc.ref}</td><td><span class="version-badge">V${doc.version}</span></td><td><a class="doc-chain-link" href="#">View on chain ↗</a></td></tr>`).join('')}</tbody></table></div>` : `<div class="records-empty is-visible"><h3 class="records-empty__title">No documents uploaded</h3><p class="records-empty__body">Supporting documents will appear here once added.</p></div>`}
      `;

      document.getElementById('package-audit').innerHTML = `
        <div class="section-tabs"><div class="tab-buttons" role="tablist" aria-label="Package audit trail"><button class="section-tab is-active" type="button">Audit Trail</button></div><a class="chain-link" href="#" target="_blank" rel="noreferrer">View on chain ↗</a></div>
        <ul class="timeline-list">${packageAudit.map((item) => `<li class="timeline-item"><span class="timeline-dot ${timelineDot(item.type)}"></span><div><span class="timeline-title">${item.event}</span><span class="timeline-meta">${item.actor} · ${formatDateTime(item.date)}</span></div></li>`).join('')}</ul>
      `;
      applyRoleUI(store.currentRole);
    }

    function renderDashboard() {
      const kpiContainer = document.getElementById('dashboard-kpis');
      const mainCard = document.getElementById('dashboard-main-card');
      const activity = document.getElementById('dashboard-activity');
      if (!kpiContainer || !mainCard || !activity) return;

      document.querySelectorAll('[data-dashboard-role]').forEach((panel) => { panel.hidden = true; });
      const assignedProjects = store.currentRole === 'finance_director'
        ? store.projects
        : store.projects.filter((project) => project.team.some((member) => member.name === store.currentUser.name));
      const packages = assignedProjects.flatMap((project) => project.packages.map((pkg) => ({ ...pkg, project })));
      const totals = assignedProjects.reduce((acc, project) => {
        const projectTotals = getProjectTotals(project);
        acc.contractValue += projectTotals.contractValue;
        acc.escrowFunded += projectTotals.escrowFunded;
        acc.totalReleased += projectTotals.totalReleased;
        return acc;
      }, { contractValue: 0, escrowFunded: 0, totalReleased: 0 });

      kpiContainer.innerHTML = `
        <article class="kpi-card"><span class="kpi-label">Contract Value</span><strong id="kpi-contract" class="kpi-value"><span class="kpi-count">${formatGBP(totals.contractValue)}</span></strong><span id="kpi-contract-note" class="kpi-note">Across ${packages.length} work packages</span></article>
        <article class="kpi-card"><span class="kpi-label">Escrow Locked</span><strong id="kpi-escrow" class="kpi-value"><span class="kpi-count">${formatGBP(totals.escrowFunded)}</span></strong><span id="kpi-escrow-note" class="kpi-note">Currently funded escrow</span></article>
        <article class="kpi-card"><span class="kpi-label">${store.currentRole === 'contractor' ? 'Released to Me' : 'Total Released'}</span><strong id="kpi-released" class="kpi-value"><span class="kpi-count">${formatGBP(totals.totalReleased)}</span></strong><span id="kpi-released-note" class="kpi-note">Paid against approved work</span></article>
      `;

      if (store.currentRole === 'finance_director') {
        const rows = packages.flatMap((pkg) => pkg.requests.filter((request) => request.pmApproved && !request.fdApproved).map((request) => ({ pkg, request })));
        mainCard.innerHTML = `<section class="assignment-card"><div class="card-head"><h2>Pending Releases</h2>${statusChip(`${rows.length} ready`)}</div><div class="table-card"><table class="action-table"><thead><tr><th>Package</th><th>PM Approved</th><th>Amount</th><th>Escrow Status</th><th>Action</th></tr></thead><tbody>${rows.map(({ pkg, request }) => `<tr><td>${pkg.name}</td><td>${request.pmApprovedBy} · ${formatDate(request.pmApprovedDate)}</td><td>${formatGBP(request.amount)}</td><td>${statusChip(pkg.status)}</td><td><button class="btn btn-primary small" type="button">Release</button></td></tr>`).join('') || `<tr><td colspan="5">No pending releases</td></tr>`}</tbody></table></div></section>`;
      } else if (store.currentRole === 'project_manager') {
        const rows = packages.flatMap((pkg) => pkg.requests.filter((request) => !request.pmApproved && request.status === 'Submitted').map((request) => ({ pkg, request })));
        mainCard.innerHTML = `<section class="assignment-card"><div class="card-head"><h2>Requests Awaiting Review</h2>${statusChip(`${rows.length} pending`)}</div><div class="table-card"><table class="action-table"><thead><tr><th>Package</th><th>Contractor</th><th>Amount</th><th>Submitted</th><th>Action</th></tr></thead><tbody>${rows.map(({ pkg, request }) => `<tr><td>${pkg.name}</td><td>${pkg.contractor}</td><td>${formatGBP(request.amount)}</td><td>${formatDate(request.date)}</td><td><button class="btn btn-primary small" type="button">Review</button></td></tr>`).join('') || `<tr><td colspan="5">No requests awaiting review</td></tr>`}</tbody></table></div></section>`;
      } else {
        const assignment = packages.find((pkg) => pkg.contractor === store.currentUser.name) || packages[0];
        mainCard.innerHTML = assignment ? `<section class="assignment-card"><div class="assignment-grid"><div><div class="chip-row"><span class="assignment-chip">Current Assignment</span><span class="assignment-chip">${assignment.status}</span><span class="assignment-chip">${assignment.id.toUpperCase()}</span></div><h2 class="assignment-title">${assignment.name}</h2><p class="assignment-description">${assignment.project.name} · ${assignment.contractor}</p><div class="assignment-stats"><div class="assignment-tile"><span class="assignment-meta">Package Cap</span><strong>${formatGBP(assignment.cap)}</strong></div><div class="assignment-tile"><span class="assignment-meta">Released</span><strong>${formatGBP(assignment.released)}</strong></div></div><div class="assignment-actions"><button class="btn btn-primary" data-visible-to="contractor" data-modal-target="submit-invoice" type="button">Submit invoice</button><a class="text-link" href="#work-package-detail" onclick="showPackageDetail('${assignment.project.id}', '${assignment.id}'); return false;">Open package →</a></div></div></div></section>` : `<section class="assignment-card"><p class="assignment-description">No current assignment.</p></section>`;
      }

      const events = store.projects.flatMap((project) => project.auditLog.map((item) => ({ ...item, project: project.name }))).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
      activity.innerHTML = events.map((item) => `<li class="timeline-item"><span class="timeline-dot ${timelineDot(item.type)}"></span><div><span class="timeline-title">${item.event}</span><span class="timeline-meta">${item.project} · ${formatDateTime(item.date)}</span></div></li>`).join('');
      maybeAnimateDashboardKpis();
    }

    function renderDashboard2() {
      const title = document.getElementById('dashboard2-role-title');
      const activity = document.getElementById('dashboard2-activity');
      const tasksList = document.getElementById('outstanding-tasks-list');
      const tasksCount = document.getElementById('outstanding-tasks-count');
      const chartContent = document.getElementById('dashboard2-chart-content');
      if (!activity || !tasksList || !tasksCount || !title || !chartContent) return;

      const roleLabel = roleFullLabel(store.currentRole);
      title.textContent = roleLabel;

      // Check if contractor role - render circular dial instead of bar chart
      if (store.currentRole === 'contractor') {
        renderContractorDial(chartContent);
      } else {
        renderBarChart(chartContent);
      }

      // Chart rendering functions
      function renderBarChart(chartContent) {
        // Render chart with dummy data (same data as fullscreen)
        const projects = [
        { name: 'Civic Library Retrofit', total: 500000,
          spentPayments: [120000, 95000, 105000],
          pendingPayments: [40000, 40000],
          unspent: 100000, daysUntilDue: 3 },
        { name: 'Demo Hospital Fit-Out', total: 800000,
          spentPayments: [180000, 140000, 130000],
          pendingPayments: [75000, 75000],
          unspent: 200000, daysUntilDue: 12 },
        { name: 'Station Works', total: 650000,
          spentPayments: [150000, 125000, 125000],
          pendingPayments: [60000, 40000],
          unspent: 150000, daysUntilDue: 7 },
        { name: 'Office Complex', total: 450000,
          spentPayments: [80000, 70000, 50000],
          pendingPayments: [60000, 60000],
          unspent: 130000, daysUntilDue: 18 },
        { name: 'Retail Park Development', total: 920000,
          spentPayments: [250000, 200000, 150000],
          pendingPayments: [90000, 90000],
          unspent: 140000, daysUntilDue: 5 },
        { name: 'School Extension', total: 380000,
          spentPayments: [120000, 90000, 70000],
          pendingPayments: [30000, 20000],
          unspent: 50000, daysUntilDue: 9 },
        { name: 'Warehouse Conversion', total: 720000,
          spentPayments: [200000, 180000, 120000],
          pendingPayments: [70000, 50000],
          unspent: 100000, daysUntilDue: 14 },
        { name: 'Community Center', total: 550000,
          spentPayments: [140000, 120000, 90000],
          pendingPayments: [50000, 40000],
          unspent: 110000, daysUntilDue: 4 },
        { name: 'Shopping Mall Renovation', total: 1200000,
          spentPayments: [320000, 280000, 200000],
          pendingPayments: [130000, 120000],
          unspent: 150000, daysUntilDue: 21 },
        { name: 'Bridge Repair', total: 680000,
          spentPayments: [170000, 140000, 110000],
          pendingPayments: [70000, 60000],
          unspent: 130000, daysUntilDue: 6 },
        { name: 'Park Infrastructure', total: 290000,
          spentPayments: [80000, 60000, 40000],
          pendingPayments: [35000, 25000],
          unspent: 50000, daysUntilDue: 11 },
        { name: 'Apartment Complex', total: 950000,
          spentPayments: [240000, 200000, 160000],
          pendingPayments: [100000, 100000],
          unspent: 150000, daysUntilDue: 16 }
      ];

      // Sort by most pressing (soonest deadline)
      projects.sort((a, b) => a.daysUntilDue - b.daysUntilDue);

      // Limit to 7 projects on dashboard
      const displayProjects = projects.slice(0, 7);

      const maxTotal = Math.max(...projects.map(p => p.total));

      chartContent.innerHTML = displayProjects.map(project => {
        const daysText = project.daysUntilDue === 1 ? '1 day' : `${project.daysUntilDue} days`;

        // Create individual segments for each payment
        const spentSegments = project.spentPayments.map(payment => {
          const percent = (payment / maxTotal) * 100;
          return `<div class="chart-bar-segment spent" style="width: ${percent}%" title="Payment: ${formatGBP(payment)}"></div>`;
        }).join('');

        const pendingSegments = project.pendingPayments.map(payment => {
          const percent = (payment / maxTotal) * 100;
          return `<div class="chart-bar-segment pending" style="width: ${percent}%" title="Pending: ${formatGBP(payment)}"></div>`;
        }).join('');

        const unspentPercent = (project.unspent / maxTotal) * 100;
        const unspentSegment = `<div class="chart-bar-segment unspent" style="width: ${unspentPercent}%" title="Unspent: ${formatGBP(project.unspent)}"></div>`;

        return `
          <div class="chart-row">
            <div class="chart-label">${project.name}</div>
            <div class="chart-bar-container">
              ${spentSegments}
              ${pendingSegments}
              ${unspentSegment}
            </div>
            <div class="chart-value">${daysText}</div>
          </div>
        `;
      }).join('');
      }

      function renderContractorDial(chartContent) {
        // Contractor view: circular dial showing project milestones
        const milestones = [
          { name: 'Foundation Pour', amount: 120000, received: true, dueDate: '2026-04-15' },
          { name: 'Steel Frame Section A', amount: 95000, received: true, dueDate: '2026-04-18' },
          { name: 'Steel Frame Section B', amount: 105000, received: true, dueDate: '2026-04-22' },
          { name: 'Electrical First Fix', amount: 40000, received: false, dueDate: '2026-04-30' },
          { name: 'Plumbing Rough-In', amount: 40000, received: false, dueDate: '2026-05-05' },
          { name: 'Roofing Installation', amount: 85000, received: false, dueDate: '2026-05-12' },
          { name: 'Window Installation', amount: 65000, received: false, dueDate: '2026-05-18' },
          { name: 'Drywall and Insulation', amount: 55000, received: false, dueDate: '2026-05-25' },
          { name: 'HVAC Installation', amount: 75000, received: false, dueDate: '2026-06-01' },
          { name: 'Interior Finishes', amount: 95000, received: false, dueDate: '2026-06-10' },
          { name: 'Final Inspection', amount: 45000, received: false, dueDate: '2026-06-15' }
        ];

        const totalValue = milestones.reduce((sum, m) => sum + m.amount, 0);
        const receivedValue = milestones.filter(m => m.received).reduce((sum, m) => sum + m.amount, 0);

        // Sort remaining milestones by due date
        const remainingMilestones = milestones.filter(m => !m.received).sort((a, b) =>
          new Date(a.dueDate) - new Date(b.dueDate)
        );

        // Calculate angles for each segment
        // Start at -90 degrees (top), leave 30 degree gap at top (15 degrees on each side)
        const gapAngle = 30;
        const startAngle = -90 + (gapAngle / 2);
        const totalAngle = 360 - gapAngle;

        // Green section for received funds
        const receivedAngle = (receivedValue / totalValue) * totalAngle;
        const receivedEndAngle = startAngle + receivedAngle;

        // Calculate angles for each remaining milestone
        let currentAngle = receivedEndAngle;
        const milestoneSegments = remainingMilestones.map((milestone, index) => {
          const segmentAngle = (milestone.amount / totalValue) * totalAngle;
          const segmentStartAngle = currentAngle;
          const segmentEndAngle = currentAngle + segmentAngle;
          currentAngle = segmentEndAngle;

          // Generate color based on position (gradient from yellow to orange to red)
          const ratio = index / Math.max(remainingMilestones.length - 1, 1);
          const hue = 60 - (ratio * 40); // From 60 (yellow) to 20 (orange-red)
          const color = `hsl(${hue}, 70%, 55%)`;

          return {
            ...milestone,
            startAngle: segmentStartAngle,
            endAngle: segmentEndAngle,
            color
          };
        });

        // Create SVG for circular dial
        const size = 320;
        const cx = size / 2;
        const cy = size / 2;
        const outerRadius = 145;
        const innerRadius = 95;

        function polarToCartesian(angle, r) {
          const rads = (angle * Math.PI) / 180;
          return {
            x: cx + r * Math.cos(rads),
            y: cy + r * Math.sin(rads)
          };
        }

        function createPieSlice(startAngle, endAngle, color, className, title) {
          const outerStart = polarToCartesian(startAngle, outerRadius);
          const outerEnd = polarToCartesian(endAngle, outerRadius);
          const innerStart = polarToCartesian(startAngle, innerRadius);
          const innerEnd = polarToCartesian(endAngle, innerRadius);
          const largeArc = endAngle - startAngle > 180 ? 1 : 0;

          // Create a filled pie slice shape with straight radial edges
          const pathData = [
            `M ${outerStart.x} ${outerStart.y}`, // Move to outer start
            `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`, // Outer arc
            `L ${innerEnd.x} ${innerEnd.y}`, // Straight line to inner end
            `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`, // Inner arc (reverse)
            `Z` // Close path
          ].join(' ');

          return `
            <path d="${pathData}"
                  fill="${color}"
                  class="${className}"
                  data-title="${title}">
              <title>${title}</title>
            </path>
          `;
        }

        // Build SVG content
        let svgPaths = '';

        // Green section for received funds
        if (receivedValue > 0) {
          svgPaths += createPieSlice(
            startAngle,
            receivedEndAngle,
            '#48a868',
            'dial-segment received',
            `Received: ${formatGBP(receivedValue)}`
          );
        }

        // Remaining milestone segments
        milestoneSegments.forEach((segment, index) => {
          svgPaths += createPieSlice(
            segment.startAngle,
            segment.endAngle,
            segment.color,
            'dial-segment pending',
            `${segment.name}: ${formatGBP(segment.amount)} (Due: ${new Date(segment.dueDate).toLocaleDateString()})`
          );
        });

        chartContent.innerHTML = `
          <div class="contractor-dial-container">
            <svg class="contractor-dial-svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
              ${svgPaths}
              <text x="${cx}" y="${cy - 20}" text-anchor="middle" class="dial-total-label">Total Project Value</text>
              <text x="${cx}" y="${cy + 20}" text-anchor="middle" class="dial-total-value">${formatGBP(totalValue)}</text>
              <text x="${cx}" y="${cy + 50}" text-anchor="middle" class="dial-received-label">Received: ${formatGBP(receivedValue)}</text>
            </svg>
            <div class="contractor-dial-legend">
              <div class="dial-legend-item">
                <div class="dial-legend-color" style="background: #48a868;"></div>
                <span>Received (${milestones.filter(m => m.received).length} milestones)</span>
              </div>
              <div class="dial-legend-item">
                <div class="dial-legend-color" style="background: #e5a853;"></div>
                <span>Soonest milestones</span>
              </div>
              <div class="dial-legend-item">
                <div class="dial-legend-color" style="background: #dc2626;"></div>
                <span>Furthest milestones</span>
              </div>
            </div>
          </div>
        `;
      }

      // Get assigned projects
      const assignedProjects = store.currentRole === 'finance_director'
        ? store.projects
        : store.projects.filter((project) => project.team.some((member) => member.name === store.currentUser.name));
      const packages = assignedProjects.flatMap((project) => project.packages.map((pkg) => ({ ...pkg, project })));

      // Get outstanding tasks based on role
      let tasks = [];
      if (store.currentRole === 'finance_director') {
        tasks = packages.flatMap((pkg) =>
          pkg.requests
            .filter((request) => request.pmApproved && !request.fdApproved)
            .map((request) => ({
              title: `Approve ${pkg.name} payment`,
              meta: `${pkg.project.name} · ${formatGBP(request.amount)}`,
              deadline: request.pmApprovedDate,
              action: 'Release'
            }))
        );
      } else if (store.currentRole === 'project_manager') {
        tasks = packages.flatMap((pkg) =>
          pkg.requests
            .filter((request) => !request.pmApproved && request.status === 'Submitted')
            .map((request) => ({
              title: `Review ${pkg.name} invoice`,
              meta: `${pkg.contractor} · ${formatGBP(request.amount)}`,
              deadline: request.date,
              action: 'Review'
            }))
        );
      } else {
        tasks = packages
          .filter((pkg) => pkg.contractor === store.currentUser.name && pkg.status === 'Active')
          .map((pkg) => ({
            title: `Submit invoice for ${pkg.name}`,
            meta: `${pkg.project.name} · ${formatGBP(pkg.cap - pkg.released)} remaining`,
            deadline: new Date().toISOString(),
            action: 'Submit'
          }));
      }

      // Sort by deadline (soonest first)
      tasks.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

      // If no tasks, add dummy data for demonstration
      if (tasks.length === 0) {
        tasks = [
          {
            type: 'submit_doc',
            title: 'Submit site inspection certificate',
            meta: '',
            deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
            action: 'Upload'
          },
          {
            type: 'review',
            title: 'Review contractor invoice',
            meta: '£92,400',
            deadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
            action: 'Review'
          },
          {
            type: 'response',
            title: 'Respond to PM query on budget',
            meta: '',
            deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            action: 'Respond'
          },
          {
            type: 'submit_doc',
            title: 'Upload compliance documentation',
            meta: '',
            deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
            action: 'Upload'
          },
          {
            type: 'review',
            title: 'Review milestone completion report',
            meta: '',
            deadline: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
            action: 'Review'
          },
          {
            type: 'response',
            title: 'Respond to change order request',
            meta: '£15,000',
            deadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
            action: 'Respond'
          },
          {
            type: 'submit_doc',
            title: 'Submit safety inspection report',
            meta: '',
            deadline: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
            action: 'Upload'
          }
        ];
      }

      // Update count
      tasksCount.textContent = `${tasks.length} task${tasks.length !== 1 ? 's' : ''}`;

      // Render all tasks (scrollable)
      tasksList.innerHTML = tasks.map((task) => {
        const daysUntil = Math.ceil((new Date(task.deadline) - new Date()) / (1000 * 60 * 60 * 24));
        const dueText = daysUntil < 0 ? 'Overdue' : daysUntil === 0 ? 'Due today' : `Due in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`;

        // Build meta text
        const metaParts = [dueText];
        if (task.meta) metaParts.push(task.meta);
        const metaText = metaParts.join(' · ');

        // Define button styles based on task type
        let buttonClass = 'btn small';
        if (task.type === 'submit_doc') {
          buttonClass += ' btn-upload'; // Blue
        } else if (task.type === 'review') {
          buttonClass += ' btn-review'; // Purple
        } else if (task.type === 'response') {
          buttonClass += ' btn-response'; // Orange
        } else {
          buttonClass += ' btn-primary'; // Default
        }

        return `
          <li class="outstanding-task-item task-type-${task.type || 'default'}">
            <div class="outstanding-task-content">
              <span class="outstanding-task-title">${task.title}</span>
              <span class="outstanding-task-meta">${metaText}</span>
            </div>
            <button class="${buttonClass}" data-task-type="${task.type}" data-task-title="${task.title}" type="button">${task.action}</button>
          </li>
        `;
      }).join('') || '<li class="outstanding-task-item"><div class="outstanding-task-content"><span class="outstanding-task-title">No outstanding tasks</span></div></li>';

      const events = store.projects.flatMap((project) => project.auditLog.map((item) => ({ ...item, project: project.name }))).sort((a, b) => new Date(b.date) - new Date(a.date));
      activity.innerHTML = events.map((item) => `<li class="timeline-item"><span class="timeline-dot ${timelineDot(item.type)}"></span><div><span class="timeline-title">${item.event}</span><span class="timeline-meta">${item.project} · ${formatDateTime(item.date)}</span></div></li>`).join('');

      // Setup task button click handlers
      tasksList.querySelectorAll('button[data-task-type]').forEach(btn => {
        btn.onclick = () => {
          const taskType = btn.dataset.taskType;
          const taskTitle = btn.dataset.taskTitle;

          // For now, only upload tasks navigate to the upload task page
          if (taskType === 'submit_doc') {
            // Store task info in sessionStorage for the upload page to use
            sessionStorage.setItem('currentTask', JSON.stringify({
              type: taskType,
              title: taskTitle
            }));
            window.location.hash = 'upload-task';
          } else {
            // TODO: Add pages for review and response tasks
            alert(`${taskType} task page coming soon!`);
          }
        };
      });

      // Setup chart expand button
      const expandBtn = document.getElementById('chart-expand-btn');
      if (expandBtn) {
        // Hide expand button for contractors (they have a circular dial, not a bar chart)
        if (store.currentRole === 'contractor') {
          expandBtn.style.display = 'none';
        } else {
          expandBtn.style.display = 'flex';
          expandBtn.onclick = () => {
            window.location.hash = 'chart-fullscreen';
          };
        }
      }
    }

    function renderChartFullscreen() {
      const chartContent = document.getElementById('chart-fullscreen-content');
      const closeBtn = document.getElementById('chart-close-btn');
      if (!chartContent) return;

      // Setup close button
      if (closeBtn) {
        closeBtn.onclick = () => {
          window.location.hash = 'dashboard2';
        };
      }

      // Render all projects with individual payment breakdowns
      const projects = [
        { name: 'Civic Library Retrofit', total: 500000,
          spentPayments: [120000, 95000, 105000],
          pendingPayments: [40000, 40000],
          unspent: 100000, daysUntilDue: 3 },
        { name: 'Demo Hospital Fit-Out', total: 800000,
          spentPayments: [180000, 140000, 130000],
          pendingPayments: [75000, 75000],
          unspent: 200000, daysUntilDue: 12 },
        { name: 'Station Works', total: 650000,
          spentPayments: [150000, 125000, 125000],
          pendingPayments: [60000, 40000],
          unspent: 150000, daysUntilDue: 7 },
        { name: 'Office Complex', total: 450000,
          spentPayments: [80000, 70000, 50000],
          pendingPayments: [60000, 60000],
          unspent: 130000, daysUntilDue: 18 },
        { name: 'Retail Park Development', total: 920000,
          spentPayments: [250000, 200000, 150000],
          pendingPayments: [90000, 90000],
          unspent: 140000, daysUntilDue: 5 },
        { name: 'School Extension', total: 380000,
          spentPayments: [120000, 90000, 70000],
          pendingPayments: [30000, 20000],
          unspent: 50000, daysUntilDue: 9 },
        { name: 'Warehouse Conversion', total: 720000,
          spentPayments: [200000, 180000, 120000],
          pendingPayments: [70000, 50000],
          unspent: 100000, daysUntilDue: 14 },
        { name: 'Community Center', total: 550000,
          spentPayments: [140000, 120000, 90000],
          pendingPayments: [50000, 40000],
          unspent: 110000, daysUntilDue: 4 },
        { name: 'Shopping Mall Renovation', total: 1200000,
          spentPayments: [320000, 280000, 200000],
          pendingPayments: [130000, 120000],
          unspent: 150000, daysUntilDue: 21 },
        { name: 'Bridge Repair', total: 680000,
          spentPayments: [170000, 140000, 110000],
          pendingPayments: [70000, 60000],
          unspent: 130000, daysUntilDue: 6 },
        { name: 'Park Infrastructure', total: 290000,
          spentPayments: [80000, 60000, 40000],
          pendingPayments: [35000, 25000],
          unspent: 50000, daysUntilDue: 11 },
        { name: 'Apartment Complex', total: 950000,
          spentPayments: [240000, 200000, 160000],
          pendingPayments: [100000, 100000],
          unspent: 150000, daysUntilDue: 16 },
        { name: 'Theatre Restoration', total: 620000,
          spentPayments: [150000, 130000, 100000],
          pendingPayments: [60000, 50000],
          unspent: 130000, daysUntilDue: 8 },
        { name: 'Industrial Estate', total: 1100000,
          spentPayments: [280000, 240000, 200000],
          pendingPayments: [110000, 110000],
          unspent: 160000, daysUntilDue: 22 },
        { name: 'Sports Complex', total: 780000,
          spentPayments: [190000, 160000, 130000],
          pendingPayments: [75000, 65000],
          unspent: 160000, daysUntilDue: 13 },
        { name: 'Hotel Expansion', total: 1400000,
          spentPayments: [380000, 320000, 250000],
          pendingPayments: [140000, 140000],
          unspent: 170000, daysUntilDue: 25 },
        { name: 'Museum Addition', total: 540000,
          spentPayments: [130000, 110000, 100000],
          pendingPayments: [50000, 45000],
          unspent: 105000, daysUntilDue: 10 },
        { name: 'University Building', total: 890000,
          spentPayments: [220000, 190000, 150000],
          pendingPayments: [85000, 85000],
          unspent: 160000, daysUntilDue: 15 },
        { name: 'Medical Clinic', total: 420000,
          spentPayments: [110000, 90000, 70000],
          pendingPayments: [40000, 35000],
          unspent: 75000, daysUntilDue: 6 },
        { name: 'Town Hall Renovation', total: 750000,
          spentPayments: [190000, 170000, 130000],
          pendingPayments: [70000, 60000],
          unspent: 130000, daysUntilDue: 17 },
        { name: 'Data Center', total: 980000,
          spentPayments: [250000, 220000, 170000],
          pendingPayments: [95000, 95000],
          unspent: 150000, daysUntilDue: 19 },
        { name: 'Fire Station', total: 510000,
          spentPayments: [130000, 110000, 80000],
          pendingPayments: [50000, 45000],
          unspent: 95000, daysUntilDue: 9 },
        { name: 'Police Headquarters', total: 860000,
          spentPayments: [220000, 190000, 140000],
          pendingPayments: [80000, 80000],
          unspent: 150000, daysUntilDue: 20 },
        { name: 'Market Square', total: 340000,
          spentPayments: [85000, 70000, 55000],
          pendingPayments: [35000, 30000],
          unspent: 65000, daysUntilDue: 7 },
        { name: 'Swimming Pool', total: 670000,
          spentPayments: [170000, 145000, 115000],
          pendingPayments: [60000, 60000],
          unspent: 120000, daysUntilDue: 14 },
        { name: 'Conference Center', total: 1050000,
          spentPayments: [270000, 230000, 180000],
          pendingPayments: [100000, 100000],
          unspent: 170000, daysUntilDue: 23 }
      ];

      projects.sort((a, b) => a.daysUntilDue - b.daysUntilDue);

      const maxTotal = Math.max(...projects.map(p => p.total));

      chartContent.innerHTML = projects.map(project => {
        const daysText = project.daysUntilDue === 1 ? '1 day' : `${project.daysUntilDue} days`;

        // Create individual segments for each payment
        const spentSegments = project.spentPayments.map(payment => {
          const percent = (payment / maxTotal) * 100;
          return `<div class="chart-bar-segment spent" style="width: ${percent}%" title="Payment: ${formatGBP(payment)}"></div>`;
        }).join('');

        const pendingSegments = project.pendingPayments.map(payment => {
          const percent = (payment / maxTotal) * 100;
          return `<div class="chart-bar-segment pending" style="width: ${percent}%" title="Pending: ${formatGBP(payment)}"></div>`;
        }).join('');

        const unspentPercent = (project.unspent / maxTotal) * 100;
        const unspentSegment = `<div class="chart-bar-segment unspent" style="width: ${unspentPercent}%" title="Unspent: ${formatGBP(project.unspent)}"></div>`;

        return `
          <div class="chart-row">
            <div class="chart-label">${project.name}</div>
            <div class="chart-bar-container">
              ${spentSegments}
              ${pendingSegments}
              ${unspentSegment}
            </div>
            <div class="chart-value">${daysText}</div>
          </div>
        `;
      }).join('');
    }

    function renderUploadTask() {
      const backBtn = document.getElementById('task-back-btn');
      const cancelBtn = document.getElementById('task-cancel-btn');
      const dropzone = document.getElementById('upload-dropzone');
      const fileInput = document.getElementById('upload-file-input');
      const browseBtn = document.getElementById('upload-browse-btn');
      const filesList = document.getElementById('uploaded-files-list');
      const submitBtn = document.getElementById('task-submit-btn');
      const titleElement = document.getElementById('upload-task-title');

      if (!dropzone || !fileInput) return;

      // Load task info from sessionStorage
      const taskData = sessionStorage.getItem('currentTask');
      if (taskData && titleElement) {
        const task = JSON.parse(taskData);
        titleElement.textContent = task.title;
      }

      let uploadedFiles = [];

      // Back button
      if (backBtn) {
        backBtn.onclick = () => {
          window.location.hash = 'dashboard2';
        };
      }

      // Cancel button
      if (cancelBtn) {
        cancelBtn.onclick = () => {
          window.location.hash = 'dashboard2';
        };
      }

      // Browse button
      if (browseBtn) {
        browseBtn.onclick = () => {
          fileInput.click();
        };
      }

      // Dropzone click
      dropzone.onclick = (e) => {
        if (e.target === dropzone || e.target.closest('.upload-icon, .upload-text, .upload-subtext')) {
          fileInput.click();
        }
      };

      // File input change
      fileInput.onchange = (e) => {
        handleFiles(e.target.files);
      };

      // Drag and drop
      dropzone.ondragover = (e) => {
        e.preventDefault();
        dropzone.classList.add('drag-over');
      };

      dropzone.ondragleave = () => {
        dropzone.classList.remove('drag-over');
      };

      dropzone.ondrop = (e) => {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
        handleFiles(e.dataTransfer.files);
      };

      function handleFiles(files) {
        Array.from(files).forEach(file => {
          // Check file size (10MB limit)
          if (file.size > 10 * 1024 * 1024) {
            alert(`File ${file.name} is too large. Maximum size is 10MB.`);
            return;
          }

          // Check file type
          const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
          if (!validTypes.includes(file.type)) {
            alert(`File ${file.name} has an invalid format. Please upload PDF, JPG, or PNG files.`);
            return;
          }

          uploadedFiles.push(file);
        });

        renderFilesList();
        updateSubmitButton();
      }

      function renderFilesList() {
        if (uploadedFiles.length === 0) {
          filesList.innerHTML = '';
          return;
        }

        filesList.innerHTML = uploadedFiles.map((file, index) => {
          const ext = file.name.split('.').pop().toUpperCase();
          const size = formatFileSize(file.size);

          return `
            <div class="uploaded-file-item">
              <div class="uploaded-file-info">
                <div class="file-icon">${ext}</div>
                <div class="file-details">
                  <div class="file-name">${file.name}</div>
                  <div class="file-size">${size}</div>
                </div>
              </div>
              <button class="file-remove-btn" data-file-index="${index}" type="button">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
          `;
        }).join('');

        // Add event listeners to remove buttons
        filesList.querySelectorAll('.file-remove-btn').forEach(btn => {
          btn.onclick = () => {
            const index = parseInt(btn.dataset.fileIndex);
            uploadedFiles.splice(index, 1);
            renderFilesList();
            updateSubmitButton();
          };
        });
      }

      function updateSubmitButton() {
        if (submitBtn) {
          submitBtn.disabled = uploadedFiles.length === 0;
        }
      }

      function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
      }

      // Submit button
      if (submitBtn) {
        submitBtn.onclick = () => {
          if (uploadedFiles.length > 0) {
            alert(`Successfully submitted ${uploadedFiles.length} file(s)!`);
            window.location.hash = 'dashboard2';
          }
        };
      }
    }

    function renderDocuments(projectId) {
      const container = document.getElementById('documents-tbody');
      if (!container) return;
      const project = projectFor(projectId);
      const requests = project ? getAllRequests(project) : [];
      const docs = store.documents.filter((doc) => doc.projectId === projectId);
      container.innerHTML = docs.map((doc) => {
        const request = requests.find((item) => item.id === doc.linkedPayment);
        const pkg = doc.packageId ? packageFor(project, doc.packageId) : null;
        return `
          <tr data-document-row="${doc.id}" data-doc-type="${doc.type}" data-doc-uploader="${doc.uploadedBy}" data-doc-date="${doc.date}">
            <td><a class="document-link" href="#" data-document-expand="${doc.id}">${doc.name}</a>${doc.fileName ? ` <span title="${doc.fileName}">📎</span>` : ''}</td>
            <td>${doc.type}</td>
            <td>${doc.ref}</td>
            <td>${doc.uploadedBy}</td>
            <td>${formatDate(doc.date)}</td>
            <td><span class="version-badge">V${doc.version}</span></td>
            <td>${pkg ? pkg.name : 'Project'}</td>
            <td>${request ? `<a class="linked-to-link" href="#" onclick="showAuditPanel('payments'); openPayment('${request.id}', true); return false;">${request.ref}</a>` : '—'}</td>
            <td>${request ? statusChip(request.status) : ''}</td>
            <td><button class="doc-chain-link" data-document-edit="${doc.id}" type="button">Edit</button> · <button class="doc-chain-link" data-document-update="${doc.id}" type="button">Update ↑</button> · <a class="doc-chain-link" href="#">View on chain ↗</a></td>
          </tr>
          ${store.activeDocumentExpandId === doc.id ? renderDocumentInfoPanel(doc, project, request, pkg) : ''}
          ${store.activeDocumentUpdateId === doc.id ? `
            <tr class="payment-detail-row is-open" data-document-update-row="${doc.id}">
              <td class="payment-detail-cell" colspan="10">
                <div class="payment-inner-panel is-active">
                  <div class="card-head">
                    <h2>Upload New Version</h2>
                    <span class="version-badge">V${doc.version}</span>
                  </div>
                  <p class="assignment-description">${doc.name}</p>
                  <div class="modal-form">
                    <div class="form-field"><label>What has changed in this version?</label><input data-document-new-ref="${doc.id}" type="text" placeholder="Describe the update e.g. revised quantities"></div>
                    <div class="form-field"><label>Updated Document Reference (optional)</label><input data-document-version-note="${doc.id}" type="text" placeholder="New file ref or URL if changed"></div>
                  </div>
                  <div class="modal-footer">
                    <button class="btn btn-ghost small" data-document-update-cancel type="button">Cancel</button>
                    <button class="btn btn-primary small" data-document-update-save="${doc.id}" type="button">Save Version</button>
                  </div>
                </div>
              </td>
            </tr>
          ` : ''}
        `;
      }).join('');
      applyDocumentFilters();
    }

    function renderDocumentInfoPanel(doc, project, request, pkg) {
      const history = doc.versionHistory?.length
        ? doc.versionHistory
        : [{ version: doc.version, date: doc.date, updatedBy: doc.uploadedBy, note: 'Original upload' }];
      return `
        <tr class="payment-detail-row is-open" data-document-info-row="${doc.id}">
          <td class="payment-detail-cell" colspan="10">
            <div class="payment-inner-panel is-active" style="display:grid; grid-template-columns:1fr 1fr; gap:var(--space-6);">
              <div>
                <h3 style="font-size:var(--text-sm); font-weight:500;">${doc.name}</h3>
                <div class="info-list">
                  <div class="info-row"><span>Type</span><span>${doc.type}</span></div>
                  <div class="info-row"><span>Ref</span><span>${doc.ref}</span></div>
                  <div class="info-row"><span>Uploaded by</span><span>${doc.uploadedBy}</span></div>
                  <div class="info-row"><span>Date</span><span>${formatDate(doc.date)}</span></div>
                  <div class="info-row"><span>Linked payment</span><span>${request ? `<a class="linked-to-link" href="#" onclick="showAuditPanel('payments'); openPayment('${request.id}', true); return false;">${request.ref}</a>` : '—'}</span></div>
                  <div class="info-row"><span>Linked package</span><span>${pkg ? pkg.name : 'Project'}</span></div>
                </div>
              </div>
              <div>
                <h4 class="linked-documents-title">Version History</h4>
                <div class="linked-document-list">
                  ${history.map((entry) => `
                    <div class="linked-document-row" style="border-bottom:1px solid var(--color-divider); padding-bottom:var(--space-2);">
                      <span class="version-badge">V${entry.version}</span>
                      <span>${formatDate(entry.date)}</span>
                      <span>${entry.updatedBy}</span>
                      <span>${entry.note || 'Version update'}</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          </td>
        </tr>
      `;
    }

    function paymentStepClass(state) {
      if (state === 'complete') return 'done';
      if (state === 'blocked') return 'rejected';
      if (state === 'in-progress') return 'hold';
      return '';
    }

    function paymentStep(label, state, actor, date, note = '') {
      return `
        <li class="approval-step ${paymentStepClass(state)}">
          <strong>${label}</strong>
          <span>${actor}${date ? ` · ${formatDate(date)}` : ''}</span>
          ${note ? `<span class="${state === 'blocked' ? 'state-note-error' : 'state-note-warning'}">${note}</span>` : ''}
        </li>
      `;
    }

    function renderPaymentTimeline(request) {
      const pmState = request.pmApproved ? 'complete' : request.status === 'Rejected' ? 'blocked' : request.status === 'Submitted' ? 'in-progress' : 'upcoming';
      const pmActor = request.pmApproved ? request.pmApprovedBy : request.status === 'Rejected' ? (request.rejectedBy || 'Rejected') : request.status === 'Submitted' ? 'Awaiting PM review' : 'PM review pending';
      const financeState = request.fdApproved ? 'complete' : request.pmApproved ? 'in-progress' : 'upcoming';
      const financeActor = request.fdApproved ? request.fdApprovedBy : request.pmApproved ? 'Awaiting Finance Director' : 'Awaiting PM approval';
      const releasedState = request.status === 'Released' ? 'complete' : 'upcoming';
      const releasedActor = request.status === 'Released' ? (request.fdApprovedBy || 'Finance Director') : 'Awaiting release';
      return `
        <ol class="approval-trail">
          ${paymentStep('Requested', 'complete', request.submittedBy, request.date)}
          ${paymentStep('PM Review', pmState, pmActor, request.pmApprovedDate, request.status === 'Rejected' ? (request.rejectionReason || 'Request rejected') : '')}
          ${paymentStep('Finance Review', financeState, financeActor, request.fdApprovedDate)}
          ${paymentStep('Released', releasedState, releasedActor, request.fdApprovedDate, request.status === 'Released' ? '<a class="doc-chain-link" href="#" target="_blank" rel="noreferrer">View on chain ↗</a>' : '')}
        </ol>
      `;
    }

    function renderPaymentDocuments(request) {
      const docs = store.documents.filter((doc) => doc.linkedPayment === request.id);
      if (!docs.length) {
        return '<p class="assignment-description">No documents linked to this payment.</p>';
      }
      return `
        <div class="linked-documents">
          <h4 class="linked-documents-title">Linked Documents</h4>
          <div class="linked-document-list">
            ${docs.map((doc) => `
              <div class="linked-document-row">
                <a class="document-link" href="#" data-linked-document="${doc.id}">${doc.name}</a>
                <span>${doc.type}</span>
                <span>${doc.ref}</span>
                <span class="version-badge">V${doc.version}</span>
                <a class="doc-chain-link" href="#">View on chain ↗</a>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    function renderPayments(projectId) {
      const wrap = document.querySelector('[data-payments-table-wrap]');
      const tbody = wrap?.querySelector('tbody');
      const project = projectFor(projectId);
      if (!wrap || !tbody || !project) return;
      const payments = project.packages.flatMap((pkg) => pkg.requests.map((request) => ({ pkg, request })));
      tbody.innerHTML = payments.map(({ pkg, request }) => `
        <tr class="payment-row" data-payment-toggle="${request.id}">
          <td>${request.ref}</td>
          <td>${pkg.name}</td>
          <td class="amount-cell">${formatGBP(request.amount)}</td>
          <td>${request.submittedBy}</td>
          <td>${formatDate(request.date)}</td>
          <td>${statusChip(request.status)}</td>
        </tr>
        <tr class="payment-detail-row" data-payment-row="${request.id}">
          <td class="payment-detail-cell" colspan="6">
            <div class="payment-inner-panel is-active" data-payment-inner-panel="${request.id}-timeline">
              ${renderPaymentTimeline(request)}
              ${renderPaymentDocuments(request)}
            </div>
          </td>
        </tr>
      `).join('');
      syncPaymentsTableEmpty();
    }

    function showProjectDetail(id) {
      renderProjectDetail(id);
      renderTimeline(id);
      window.location.hash = 'project-detail';
    }

    function showPackageDetail(projectId, packageId) {
      renderPackageDetail(projectId, packageId);
      window.location.hash = 'work-package-detail';
    }

    function activeProject() {
      return projectFor(store.activeProjectId || store.currentProjectId || store.projects[0]?.id);
    }

    function activePackage(project = activeProject()) {
      return packageFor(project, store.activePackageId || store.currentPackageId || project?.packages[0]?.id);
    }

    function activeRequest(pkg = activePackage()) {
      return pkg?.requests.find((request) => request.id === store.activeRequestId) || pkg?.requests[pkg.requests.length - 1] || null;
    }

    function modalFieldValue(modal, index) {
      const fields = modal.querySelectorAll('.form-field input, .form-field select, .form-field textarea');
      return fields[index]?.value.trim() || '';
    }

    function fieldValue(selector) {
      return document.querySelector(selector)?.value.trim() || '';
    }

    function formatFileSize(bytes) {
      if (!bytes) return '0 KB';
      if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
      return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    }

    function selectedContractModel() {
      const title = document.querySelector('[data-contract-model-card].is-selected h3')?.textContent || 'Milestone-Based';
      if (title.includes('Valuation')) return 'valuation';
      if (title.includes('Bespoke')) return 'bespoke';
      return 'milestone';
    }

    function roleKeyFromFormLabel(label) {
      if (label === 'Finance Director') return 'finance_director';
      if (label === 'Project Manager') return 'project_manager';
      return 'contractor';
    }

    function currentContextIds() {
      const project = activeProject();
      const pkg = activePackage(project);
      const request = activeRequest(pkg);
      return {
        projectId: project?.id,
        packageId: pkg?.id,
        requestId: request?.id,
      };
    }

    function syncMilestoneStatuses(project) {
      if (!project?.milestones?.length) return;
      project.milestones.forEach((milestone) => {
        const packages = milestone.packageIds.map((id) => packageFor(project, id)).filter(Boolean);
        if (packages.some((pkg) => pkg.status === 'Locked')) {
          milestone.status = 'blocked';
        } else if (packages.length && packages.every((pkg) => pkg.status === 'Released' || pkg.requests.some((request) => request.status === 'Released'))) {
          milestone.status = 'complete';
        } else if (packages.some((pkg) => pkg.requests.length > 0)) {
          milestone.status = 'in-progress';
        } else {
          milestone.status = 'upcoming';
        }
      });
    }

    function createProject(formData, milestones) {
      const project = {
        id: 'proj-' + Date.now(),
        name: formData.name,
        client: formData.client,
        contractRef: formData.contractRef,
        contractModel: formData.contractModel,
        startDate: formData.startDate,
        endDate: formData.endDate,
        status: 'Active',
        team: [
          { name: formData.pm, role: 'project_manager', org: '' },
          { name: formData.fd, role: 'finance_director', org: '' },
        ],
        packages: [],
        documents: [],
        milestones: milestones || [],
        auditLog: [],
      };
      store.projects.push(project);
      logAudit(project, 'Project created', 'info');
      renderProjectsList();
      showProjectDetail(project.id);
    }

    function addPackage(projectId, formData) {
      const project = projectFor(projectId);
      if (!project) return;
      const pkg = {
        id: 'wp-' + Date.now(),
        name: formData.name,
        cap: parseFloat(formData.cap) || 0,
        funded: 0,
        released: 0,
        status: 'Pending',
        contractor: formData.contractor,
        requests: [],
      };
      project.packages.push(pkg);
      if (formData.milestoneId && project.milestones?.length) {
        const milestone = project.milestones.find((item) => item.id === formData.milestoneId);
        if (milestone) milestone.packageIds.push(pkg.id);
      }
      syncMilestoneStatuses(project);
      store.activePackageId = pkg.id;
      logAudit(project, 'Package added: ' + pkg.name, 'info');
      renderProjectDetail(projectId);
    }

    function fundPackage(projectId, packageId, amount) {
      const project = projectFor(projectId);
      const pkg = packageFor(project, packageId);
      if (!project || !pkg) return;
      const value = parseFloat(amount) || 0;
      pkg.funded += value;
      pkg.status = pkg.funded >= pkg.cap ? 'Funded' : 'Partially Funded';
      syncMilestoneStatuses(project);
      logAudit(project, 'Package funded: ' + pkg.name + ' (+' + formatGBP(value) + ')', 'released');
      renderProjectDetail(projectId);
      if (currentRoute() === 'work-package-detail') renderPackageDetail(projectId, packageId);
      renderDashboard();
    }

    function placeHold(projectId, packageId, reason) {
      const project = projectFor(projectId);
      const pkg = packageFor(project, packageId);
      if (!project || !pkg) return;
      pkg.status = 'Locked';
      syncMilestoneStatuses(project);
      logAudit(project, 'Hold placed on ' + pkg.name + ': ' + reason, 'rejected');
      renderProjectDetail(projectId);
      if (currentRoute() === 'work-package-detail') renderPackageDetail(projectId, packageId);
      renderDashboard();
    }

    function submitInvoice(projectId, packageId, formData) {
      const project = projectFor(projectId);
      const pkg = packageFor(project, packageId);
      if (!project || !pkg) return;
      const request = {
        id: 'req-' + Date.now(),
        ref: formData.ref,
        amount: parseFloat(formData.amount) || 0,
        submittedBy: store.currentUser.name,
        date: new Date().toISOString().split('T')[0],
        status: 'Submitted',
        pmApproved: false,
        fdApproved: false,
        documents: [],
      };
      pkg.requests.push(request);
      store.activeRequestId = request.id;
      syncMilestoneStatuses(project);
      logAudit(project, 'Invoice submitted: ' + request.ref + ' for ' + formatGBP(request.amount), 'pending');
      renderPackageDetail(projectId, packageId);
      renderPayments(projectId);
      renderDashboard();
    }

    function approveRequest(projectId, packageId, requestId, note) {
      const project = projectFor(projectId);
      const pkg = packageFor(project, packageId);
      const req = pkg?.requests.find((request) => request.id === requestId);
      if (!project || !pkg || !req) return;
      req.pmApproved = true;
      req.pmApprovedBy = store.currentUser.name;
      req.pmApprovedDate = new Date().toISOString().split('T')[0];
      req.status = 'Pending Finance Review';
      if (note) req.pmNote = note;
      syncMilestoneStatuses(project);
      logAudit(project, 'Request approved by PM: ' + req.ref, 'released');
      renderPackageDetail(projectId, packageId);
      renderPayments(projectId);
      renderDashboard();
    }

    function rejectRequest(projectId, packageId, requestId, reason) {
      const project = projectFor(projectId);
      const pkg = packageFor(project, packageId);
      const req = pkg?.requests.find((request) => request.id === requestId);
      if (!project || !pkg || !req) return;
      req.status = 'Rejected';
      req.rejectedBy = store.currentUser.name;
      req.rejectionReason = reason;
      syncMilestoneStatuses(project);
      logAudit(project, 'Request rejected: ' + req.ref + ' — ' + reason, 'rejected');
      renderPackageDetail(projectId, packageId);
      renderPayments(projectId);
      renderDashboard();
    }

    function releaseFunds(projectId, packageId, requestId) {
      const project = projectFor(projectId);
      const pkg = packageFor(project, packageId);
      const req = pkg?.requests.find((request) => request.id === requestId);
      if (!project || !pkg || !req) return;
      req.fdApproved = true;
      req.fdApprovedBy = store.currentUser.name;
      req.fdApprovedDate = new Date().toISOString().split('T')[0];
      req.status = 'Released';
      pkg.released += req.amount;
      syncMilestoneStatuses(project);
      logAudit(project, 'Funds released: ' + formatGBP(req.amount) + ' for ' + pkg.name, 'released');
      renderPackageDetail(projectId, packageId);
      renderProjectDetail(projectId);
      renderPayments(projectId);
      renderDashboard();
    }

    function addTeamMember(projectId, formData) {
      const project = projectFor(projectId);
      if (!project) return;
      project.team.push({
        name: formData.name,
        role: formData.role,
        org: formData.org,
      });
      logAudit(project, formData.name + ' added to team as ' + formData.role, 'info');
      renderProjectDetail(projectId);
    }

    function addDocument(projectId, formData, packageId = null) {
      const doc = {
        id: 'doc-' + Date.now(),
        name: formData.name,
        type: formData.type,
        ref: formData.ref,
        uploadedBy: store.currentUser.name,
        date: new Date().toISOString().split('T')[0],
        version: 1,
        linkedPayment: formData.linkedPayment || null,
        projectId,
        packageId: packageId || null,
      };
      if (formData.fileName) {
        doc.fileName = formData.fileName;
        doc.fileSize = formData.fileSize;
      }
      store.documents.push(doc);
      const project = projectFor(projectId);
      if (project && formData.linkedPayment) {
        getAllRequests(project).find((request) => request.id === formData.linkedPayment)?.documents.push(doc.id);
      }
      if (project) logAudit(project, 'Document added: ' + doc.name, 'info');
      renderDocuments(projectId);
      renderPayments(projectId);
      if (store.activePackageId) renderPackageDetail(projectId, store.activePackageId);
    }

    function editDocument(docId, formData) {
      const doc = store.documents.find((item) => item.id === docId);
      if (!doc) return;
      doc.name = formData.name;
      doc.type = formData.type;
      doc.ref = formData.ref;
      doc.linkedPayment = formData.linkedPayment || null;
      doc.packageId = formData.packageId || null;
      const project = projectFor(doc.projectId);
      if (project) logAudit(project, 'Document edited: ' + doc.name, 'info');
      store.activeEditDocumentId = null;
      renderDocuments(doc.projectId);
      renderPayments(doc.projectId);
      if (store.activePackageId) renderPackageDetail(doc.projectId, store.activePackageId);
    }

    function updateDocument(docId, newRef, note) {
      const doc = store.documents.find((item) => item.id === docId);
      if (!doc) return;
      if (!doc.versionHistory) doc.versionHistory = [];
      doc.versionHistory.unshift({
        version: doc.version,
        date: doc.lastUpdatedDate || doc.date,
        updatedBy: doc.lastUpdatedBy || doc.uploadedBy,
        note: note || 'Version update',
      });
      doc.version += 1;
      doc.ref = newRef;
      doc.versionNote = note;
      doc.lastUpdatedBy = store.currentUser.name;
      doc.lastUpdatedDate = new Date().toISOString().split('T')[0];
      store.activeDocumentUpdateId = null;
      const project = projectFor(doc.projectId);
      if (project) {
        logAudit(project, doc.name + ' updated to V' + doc.version, 'info');
        renderProjectDetail(doc.projectId);
      } else {
        renderDocuments(doc.projectId);
      }
    }

    function renderRole() {
      const role = roles[roleIndex];
      currentRole = roleKeyFromLabel(role.label);
      store.currentRole = currentRole;
      store.currentUser = {
        name: currentRole === 'finance_director' ? 'Maya Shah' : currentRole === 'project_manager' ? 'Eleanor Lane' : 'Daniel Okafor',
        initials: currentRole === 'finance_director' ? 'MS' : currentRole === 'project_manager' ? 'EL' : 'DO',
        org: role.org,
      };
      const settingsName = document.getElementById('settings-name');
      const settingsRole = document.getElementById('settings-role');
      const roleShortLabel = role.label === 'Finance Director' ? 'Finance' : role.label === 'Project Manager' ? 'PM' : 'Contractor';
      document.getElementById('role-toggle').textContent = role.label;
      document.getElementById('avatar').textContent = role.initials;
      document.getElementById('user-name').textContent = role.label;
      if (settingsName) settingsName.value = role.label === 'Contractor' ? 'Daniel Okafor' : `${role.name} ${role.label === 'Finance Director' ? 'Shah' : 'Lane'}`;
      if (settingsRole) settingsRole.textContent = roleShortLabel;
      document.getElementById('dashboard-role-label').textContent = `${role.label} · ${role.org}`.toUpperCase();
      document.getElementById('dashboard-greeting').textContent = `Welcome back, ${role.name}.`;
      document.getElementById('dashboard-context').textContent = role.context;
      setKpiCountText('kpi-contract', role.kpis.contract);
      document.getElementById('kpi-contract-note').textContent = role.kpis.contractNote;
      setKpiCountText('kpi-escrow', role.kpis.escrow);
      document.getElementById('kpi-escrow-note').textContent = role.kpis.escrowNote;
      setKpiCountText('kpi-released', role.kpis.released);
      document.getElementById('kpi-released-note').textContent = role.kpis.releasedNote;
      document.querySelectorAll('[data-dashboard-role]').forEach((panel) => {
        panel.classList.toggle('is-active', panel.dataset.dashboardRole === role.label);
      });
      applyRoleUI(currentRole);
      renderDashboard();
      renderDashboard2();
      renderProjectsList();
    }

    function applyProjectContractModel(project) {
      const model = project.dataset.projectModel || 'Milestone';
      const name = project.dataset.projectName || 'Demo Hospital Fit-Out';
      const client = project.dataset.projectClient || 'Northstar Health Trust';
      const start = project.dataset.projectStart || '12 Feb 2026';
      const modelConfig = {
        Milestone: {
          column: 'Milestone Stage',
          cellKey: 'milestoneStage',
          summaryLabel: 'Next Milestone',
          summaryValue: 'Stage 2 of 3',
          summaryNote: 'Steel frame completion gate',
          packageContext: 'Contract type: Milestone · Stage 2 of 3',
        },
        Valuation: {
          column: 'Valuation Period',
          cellKey: 'valuationPeriod',
          summaryLabel: 'Next Valuation',
          summaryValue: '30 Apr 2026',
          summaryNote: 'Monthly interim certificate',
          packageContext: 'Contract type: Valuation · Month 4',
        },
        Bespoke: {
          column: 'Release Trigger',
          cellKey: 'releaseTrigger',
          summaryLabel: 'Remaining',
          summaryValue: '£3.08m',
          summaryNote: 'Contract value less released',
          packageContext: 'Contract type: Bespoke · Manual release',
        },
      };
      const config = modelConfig[model] || modelConfig.Milestone;

      document.querySelector('[data-project-detail-breadcrumb]').textContent = `Projects → ${name}`;
      document.querySelector('[data-project-detail-name]').textContent = name;
      document.querySelector('[data-project-detail-client]').textContent = client;
      document.querySelector('[data-project-detail-model]').textContent = model;
      document.querySelector('[data-project-detail-start]').textContent = `Started ${start}`;
      document.querySelector('[data-model-summary-label]').textContent = config.summaryLabel;
      document.querySelector('[data-model-summary-value]').textContent = config.summaryValue;
      document.querySelector('[data-model-summary-note]').textContent = config.summaryNote;
      document.querySelector('[data-model-column-label]').textContent = config.column;
      document.querySelectorAll('[data-model-cell]').forEach((cell) => {
        cell.textContent = cell.dataset[config.cellKey];
      });
      document.querySelector('[data-package-contract-context]').textContent = config.packageContext;
    }

    document.querySelectorAll('[data-project-row]').forEach((row) => {
      row.addEventListener('click', () => {
        applyProjectContractModel(row);
        window.location.hash = 'project-detail';
      });
    });

    function showAuditPanel(target) {
      document.querySelectorAll('[data-audit-tab]').forEach((item) => {
        item.classList.toggle('is-active', item.dataset.auditTab === target);
      });
      document.querySelectorAll('[data-audit-panel]').forEach((panel) => {
        panel.classList.toggle('is-active', panel.dataset.auditPanel === target);
      });
      syncDocumentTableEmpty();
    }

    function clearRecordHighlights() {
      document.querySelectorAll('.is-highlighted').forEach((row) => {
        row.classList.remove('is-highlighted');
      });
    }

    function documentDateMatches(dateValue, filterValue) {
      if (filterValue === 'all') return true;
      const documentDate = new Date(`${dateValue}T00:00:00`);
      const demoToday = new Date('2026-04-14T00:00:00');
      const daysAgo = (demoToday - documentDate) / (1000 * 60 * 60 * 24);
      if (filterValue === 'week') return daysAgo >= 0 && daysAgo <= 7;
      if (filterValue === 'month') {
        return documentDate.getFullYear() === demoToday.getFullYear() && documentDate.getMonth() === demoToday.getMonth();
      }
      if (filterValue === 'quarter') return daysAgo >= 0 && daysAgo <= 90;
      return true;
    }

    function applyDocumentFilters() {
      const typeEl = document.querySelector('[data-doc-filter="type"]');
      if (!typeEl) return;
      const type = typeEl.value;
      const uploader = document.querySelector('[data-doc-filter="uploader"]').value;
      const date = document.querySelector('[data-doc-filter="date"]').value;

      document.querySelectorAll('[data-document-row]').forEach((row) => {
        const matchesType = type === 'all' || row.dataset.docType === type;
        const matchesUploader = uploader === 'all' || row.dataset.docUploader === uploader;
        const matchesDate = documentDateMatches(row.dataset.docDate, date);
        const isVisible = matchesType && matchesUploader && matchesDate;
        const versionTarget = row.querySelector('[data-version-toggle]')?.dataset.versionToggle;
        const versionRow = versionTarget ? document.querySelector(`[data-version-row="${versionTarget}"]`) : null;

        row.hidden = !isVisible;
        if (versionRow) {
          versionRow.hidden = !isVisible;
          if (!isVisible) versionRow.classList.remove('is-open');
        }
        const updateRow = document.querySelector(`[data-document-update-row="${row.dataset.documentRow}"]`);
        if (updateRow) updateRow.hidden = !isVisible;
      });
      syncDocumentTableEmpty();
    }

    function resetDocumentFilters() {
      document.querySelectorAll('[data-doc-filter]').forEach((filter) => {
        filter.value = 'all';
      });
      applyDocumentFilters();
    }

    function openPayment(paymentId, shouldHighlight = false) {
      const triggerRow = document.querySelector(`[data-payment-toggle="${paymentId}"]`);
      const detailRow = document.querySelector(`[data-payment-row="${paymentId}"]`);
      if (!triggerRow || !detailRow) return;
      document.querySelectorAll('[data-payment-row]').forEach((paymentRow) => {
        paymentRow.classList.remove('is-open');
      });
      detailRow.classList.add('is-open');
      if (shouldHighlight) {
        clearRecordHighlights();
        triggerRow.classList.add('is-highlighted');
      }
      triggerRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function highlightDocument(documentId) {
      const documentRow = document.querySelector(`[data-document-row="${documentId}"]`);
      if (!documentRow) return;
      resetDocumentFilters();
      clearRecordHighlights();
      documentRow.classList.add('is-highlighted');
      documentRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    document.querySelectorAll('[data-audit-tab]').forEach((tab) => {
      tab.addEventListener('click', () => {
        showAuditPanel(tab.dataset.auditTab);
      });
    });

    document.querySelectorAll('[data-version-toggle]').forEach((badge) => {
      badge.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const target = badge.dataset.versionToggle;
        const row = document.querySelector(`[data-version-row="${target}"]`);
        const isOpen = row.classList.contains('is-open');
        document.querySelectorAll('[data-version-row]').forEach((versionRow) => {
          versionRow.classList.remove('is-open');
        });
        if (!isOpen) {
          row.classList.add('is-open');
        }
      });
    });

    document.querySelectorAll('[data-doc-filter]').forEach((filter) => {
      filter.addEventListener('change', applyDocumentFilters);
    });

    document.querySelectorAll('[data-payment-toggle]').forEach((row) => {
      row.addEventListener('click', (event) => {
        if (event.target.closest('a, button')) return;
        const target = row.dataset.paymentToggle;
        const detailRow = document.querySelector(`[data-payment-row="${target}"]`);
        const isOpen = detailRow.classList.contains('is-open');
        document.querySelectorAll('[data-payment-row]').forEach((paymentRow) => {
          paymentRow.classList.remove('is-open');
        });
        clearRecordHighlights();
        if (!isOpen) {
          detailRow.classList.add('is-open');
        }
      });
    });

    document.addEventListener('click', (event) => {
      const row = event.target.closest('[data-payment-toggle]');
      if (!row || !row.classList.contains('payment-row') || event.target.closest('a, button')) return;
      const target = row.dataset.paymentToggle;
      const detailRow = document.querySelector(`[data-payment-row="${target}"]`);
      if (!detailRow) return;
      const isOpen = detailRow.classList.contains('is-open');
      document.querySelectorAll('[data-payment-row]').forEach((paymentRow) => {
        paymentRow.classList.remove('is-open');
      });
      clearRecordHighlights();
      if (!isOpen) detailRow.classList.add('is-open');
    });

    document.querySelectorAll('[data-linked-payment]').forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        showAuditPanel('payments');
        openPayment(link.dataset.linkedPayment, true);
      });
    });

    document.querySelectorAll('[data-linked-document]').forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        showAuditPanel('documents');
        highlightDocument(link.dataset.linkedDocument);
      });
    });

    document.addEventListener('click', (event) => {
      const expandLink = event.target.closest('[data-document-expand]');
      if (expandLink) {
        event.preventDefault();
        const docId = expandLink.dataset.documentExpand;
        store.activeDocumentExpandId = store.activeDocumentExpandId === docId ? null : docId;
        store.activeDocumentUpdateId = null;
        renderDocuments(store.activeProjectId || store.currentProjectId || store.projects[0].id);
        return;
      }

      const editButton = event.target.closest('[data-document-edit]');
      if (editButton) {
        prepareEditDocumentModal(editButton.dataset.documentEdit);
        openModal('edit-document');
        return;
      }

      const updateButton = event.target.closest('[data-document-update]');
      if (updateButton) {
        store.activeDocumentUpdateId = updateButton.dataset.documentUpdate;
        renderDocuments(store.activeProjectId || store.currentProjectId || store.projects[0].id);
        return;
      }

      const cancelButton = event.target.closest('[data-document-update-cancel]');
      if (cancelButton) {
        store.activeDocumentUpdateId = null;
        renderDocuments(store.activeProjectId || store.currentProjectId || store.projects[0].id);
        return;
      }

      const saveButton = event.target.closest('[data-document-update-save]');
      if (!saveButton) return;
      const docId = saveButton.dataset.documentUpdateSave;
      const newRef = document.querySelector(`[data-document-new-ref="${docId}"]`)?.value.trim();
      const note = document.querySelector(`[data-document-version-note="${docId}"]`)?.value.trim() || '';
      if (!newRef) return;
      updateDocument(docId, newRef, note);
    });

    document.querySelectorAll('[data-settings-tab]').forEach((tab) => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.settingsTab;
        document.querySelectorAll('[data-settings-tab]').forEach((item) => {
          item.classList.toggle('is-active', item.dataset.settingsTab === target);
        });
        document.querySelectorAll('[data-settings-panel]').forEach((panel) => {
          panel.classList.toggle('is-active', panel.dataset.settingsPanel === target);
        });
      });
    });

    document.querySelectorAll('.toggle-switch').forEach((toggle) => {
      toggle.addEventListener('click', () => {
        const isOn = toggle.classList.toggle('is-on');
        toggle.setAttribute('aria-pressed', String(isOn));
      });
    });

    function milestoneRows() {
      return [...document.querySelectorAll('[data-milestone-row]')];
    }

    function getMilestoneRowValues() {
      return milestoneRows().map((row) => ({
        name: row.querySelector('[data-milestone-name]')?.value.trim() || '',
        targetDate: row.querySelector('[data-milestone-date]')?.value || '',
        status: 'upcoming',
        packageIds: [],
      }));
    }

    function renderMilestoneBuilder(rows = [
      { name: 'Foundation & Groundworks', targetDate: '' },
      { name: 'Structural Frame', targetDate: '' },
    ]) {
      const builder = document.querySelector('[data-milestone-builder]');
      if (!builder) return;
      builder.innerHTML = rows.map((row, index) => `
        <div data-milestone-row style="display:flex; gap:var(--space-3); align-items:center; margin-bottom:var(--space-3);">
          <input type="text" value="${row.name || ''}" placeholder="Milestone Name" data-milestone-name style="flex:1;">
          <input type="date" value="${row.targetDate || ''}" data-milestone-date style="width:160px;">
          <button type="button" data-remove-milestone-row aria-label="Remove milestone" ${rows.length === 1 ? 'disabled' : ''}>×</button>
        </div>
      `).join('');
      validateMilestoneProjectForm();
    }

    function collectMilestones() {
      return getMilestoneRowValues().filter((milestone) => milestone.name || milestone.targetDate);
    }

    function validateMilestoneProjectForm() {
      const createButton = document.querySelector('[data-new-project-create]');
      if (!createButton || selectedContractModel() !== 'milestone') {
        if (createButton) createButton.disabled = false;
        return;
      }
      const milestones = getMilestoneRowValues();
      const namedCount = milestones.filter((milestone) => milestone.name).length;
      const allDates = milestones.length > 0 && milestones.every((milestone) => milestone.targetDate);
      createButton.disabled = namedCount < 2 || !allDates;
    }

    function renderPackageMilestoneField() {
      const project = activeProject();
      const field = document.querySelector('[data-package-milestone-field]');
      const select = document.querySelector('[data-package-milestone-select]');
      if (!field || !select) return;
      const shouldShow = project?.contractModel === 'milestone' && project.milestones?.length;
      field.hidden = !shouldShow;
      if (!shouldShow) {
        select.innerHTML = '';
        return;
      }
      select.innerHTML = project.milestones.map((milestone) => `<option value="${milestone.id}">${milestone.name}</option>`).join('');
    }

    function renderNewProjectStep(step) {
      const isMilestone = selectedContractModel() === 'milestone';
      document.querySelectorAll('[data-new-project-step]').forEach((item) => {
        const itemStep = Number(item.dataset.newProjectStep);
        item.classList.toggle('is-active', itemStep === step);
        item.classList.toggle('is-complete', itemStep < step);
      });
      document.querySelectorAll('[data-new-project-milestone-step]').forEach((item) => {
        item.hidden = !isMilestone;
      });
      document.querySelectorAll('[data-new-project-panel]').forEach((panel) => {
        panel.classList.toggle('is-active', Number(panel.dataset.newProjectPanel) === step);
      });
      const backButton = document.querySelector('[data-new-project-back]');
      const nextButton = document.querySelector('[data-new-project-next]');
      const createButton = document.querySelector('[data-new-project-create]');
      if (backButton) backButton.hidden = step === 1;
      if (nextButton) nextButton.hidden = step !== 1 && !(step === 2 && isMilestone);
      if (createButton) createButton.hidden = isMilestone ? step !== 3 : step !== 2;
      validateMilestoneProjectForm();
    }

    document.querySelectorAll('[data-contract-model-card]').forEach((card) => {
      card.addEventListener('click', () => {
        document.querySelectorAll('[data-contract-model-card]').forEach((item) => {
          const isSelected = item === card;
          item.classList.toggle('is-selected', isSelected);
          item.setAttribute('aria-pressed', String(isSelected));
        });
        const activeStep = Number(document.querySelector('.modal-step.is-active[data-new-project-step]')?.dataset.newProjectStep || 1);
        renderNewProjectStep(Math.min(activeStep, selectedContractModel() === 'milestone' ? 3 : 2));
      });
    });

    document.querySelector('[data-new-project-next]')?.addEventListener('click', () => {
      const activeStep = Number(document.querySelector('.modal-step.is-active[data-new-project-step]')?.dataset.newProjectStep || 1);
      renderNewProjectStep(activeStep === 2 && selectedContractModel() === 'milestone' ? 3 : 2);
    });

    document.querySelector('[data-new-project-back]')?.addEventListener('click', () => {
      const activeStep = Number(document.querySelector('.modal-step.is-active[data-new-project-step]')?.dataset.newProjectStep || 1);
      renderNewProjectStep(activeStep === 3 ? 2 : 1);
    });

    document.querySelector('[data-add-milestone-row]')?.addEventListener('click', () => {
      const rows = getMilestoneRowValues();
      rows.push({ name: '', targetDate: '', status: 'upcoming', packageIds: [] });
      renderMilestoneBuilder(rows);
    });

    document.querySelector('[data-milestone-builder]')?.addEventListener('click', (event) => {
      const removeButton = event.target.closest('[data-remove-milestone-row]');
      if (!removeButton) return;
      const rows = getMilestoneRowValues();
      const index = milestoneRows().indexOf(removeButton.closest('[data-milestone-row]'));
      rows.splice(index, 1);
      renderMilestoneBuilder(rows.length ? rows : [{ name: '', targetDate: '', status: 'upcoming', packageIds: [] }]);
    });

    document.querySelector('[data-milestone-builder]')?.addEventListener('input', validateMilestoneProjectForm);

    function handleModalSubmit(modal) {
      const modalName = modal.dataset.modal;
      const context = currentContextIds();
      if (modalName === 'new-project') {
        const contractModel = selectedContractModel();
        createProject({
          name: modalFieldValue(modal, 0) || 'Untitled Project',
          client: modalFieldValue(modal, 1) || 'Client Organisation',
          contractRef: modalFieldValue(modal, 2) || 'REF-' + Date.now(),
          startDate: modalFieldValue(modal, 3) || new Date().toISOString().split('T')[0],
          endDate: modalFieldValue(modal, 4) || new Date().toISOString().split('T')[0],
          pm: modalFieldValue(modal, 5) || 'Eleanor Lane',
          fd: modalFieldValue(modal, 6) || 'Maya Shah',
          contractModel,
        }, contractModel === 'milestone' ? collectMilestones().map((milestone, index) => ({
          id: 'ms-' + Date.now() + '-' + index,
          name: milestone.name,
          targetDate: milestone.targetDate,
          status: 'upcoming',
          packageIds: [],
        })) : []);
      }

      if (modalName === 'add-package') {
        addPackage(context.projectId, {
          name: modalFieldValue(modal, 0) || 'New Work Package',
          cap: modalFieldValue(modal, 1) || '0',
          contractor: modalFieldValue(modal, 2) || 'Daniel Okafor',
          milestoneId: document.querySelector('[data-package-milestone-select]')?.value || null,
        });
      }

      if (modalName === 'fund-package') {
        fundPackage(context.projectId, context.packageId, modalFieldValue(modal, 0) || '0');
      }

      if (modalName === 'place-hold') {
        placeHold(context.projectId, context.packageId, modalFieldValue(modal, 0) || 'No reason provided');
      }

      if (modalName === 'submit-invoice') {
        submitInvoice(context.projectId, context.packageId, {
          ref: modalFieldValue(modal, 0) || 'INV-' + Date.now(),
          amount: modalFieldValue(modal, 1) || '0',
        });
      }

      if (modalName === 'approve-request') {
        approveRequest(context.projectId, context.packageId, context.requestId, modalFieldValue(modal, 0));
      }

      if (modalName === 'reject-request') {
        rejectRequest(context.projectId, context.packageId, context.requestId, modalFieldValue(modal, 0) || 'No reason provided');
      }

      if (modalName === 'release-funds') {
        releaseFunds(context.projectId, context.packageId, context.requestId);
      }

      if (modalName === 'add-team-member') {
        addTeamMember(context.projectId, {
          name: modalFieldValue(modal, 0) || 'New Team Member',
          role: roleKeyFromFormLabel(modalFieldValue(modal, 2) || 'Contractor'),
          org: modalFieldValue(modal, 3) || '',
        });
      }

      if (modalName === 'add-document') {
        const project = activeProject();
        const selectedPackageId = document.querySelector('[data-document-package-select]')?.value || '';
        const packageId = store.activePackageId || selectedPackageId || null;
        const linkedRef = fieldValue('[data-add-document-payment]');
        const linkedRequest = project ? getAllRequests(project).find((request) => request.ref === linkedRef) : null;
        const file = document.querySelector('[data-add-document-file]')?.files?.[0] || null;
        const urlRef = fieldValue('[data-add-document-url]');
        addDocument(context.projectId, {
          name: fieldValue('[data-add-document-name]') || 'Untitled Document',
          type: fieldValue('[data-add-document-type]') || 'Certificate',
          ref: urlRef || fieldValue('[data-add-document-ref]') || 'DOC-' + Date.now(),
          linkedPayment: linkedRef === 'Not linked' ? null : linkedRequest?.id || null,
          fileName: file?.name || null,
          fileSize: file ? formatFileSize(file.size) : null,
        }, packageId);
      }

      if (modalName === 'edit-document') {
        const project = activeProject();
        const linkedRef = fieldValue('[data-edit-document-payment]');
        const linkedRequest = project ? getAllRequests(project).find((request) => request.ref === linkedRef) : null;
        editDocument(store.activeEditDocumentId, {
          name: fieldValue('[data-edit-document-name]') || 'Untitled Document',
          type: fieldValue('[data-edit-document-type]') || 'Certificate',
          ref: fieldValue('[data-edit-document-ref]') || 'DOC-' + Date.now(),
          linkedPayment: linkedRef === 'Not linked' ? null : linkedRequest?.id || null,
          packageId: fieldValue('[data-edit-document-package]') || null,
        });
      }

      closeModal(modal);
      applyRoleUI(store.currentRole);
    }

    function prepareAddDocumentModal(trigger) {
      if (!trigger || trigger.dataset.modalTarget !== 'add-document') return;
      const project = activeProject();
      const attachLabel = document.querySelector('[data-document-attach-label]');
      const packageField = document.querySelector('[data-document-package-field]');
      const packageSelect = document.querySelector('[data-document-package-select]');
      const isPackageContext = trigger.dataset.documentScope === 'package' || currentRoute() === 'work-package-detail';

      if (isPackageContext) {
        store.activePackageId = store.currentPackageId || store.activePackageId;
        const pkg = activePackage(project);
        if (attachLabel) {
          attachLabel.textContent = `Attaching to: ${pkg?.name || 'Current package'}`;
          attachLabel.hidden = false;
        }
        if (packageField) packageField.hidden = true;
        return;
      }

      store.activePackageId = null;
      if (attachLabel) {
        attachLabel.textContent = '';
        attachLabel.hidden = true;
      }
      if (packageField) packageField.hidden = false;
      if (packageSelect) {
        packageSelect.innerHTML = [
          '<option value="">Project level</option>',
          ...(project?.packages || []).map((pkg) => `<option value="${pkg.id}">${pkg.name}</option>`),
        ].join('');
      }
    }

    function prepareEditDocumentModal(docId) {
      const doc = store.documents.find((item) => item.id === docId);
      const project = doc ? projectFor(doc.projectId) : activeProject();
      if (!doc || !project) return;
      store.activeEditDocumentId = docId;
      document.querySelector('[data-edit-document-name]').value = doc.name;
      document.querySelector('[data-edit-document-type]').value = doc.type;
      document.querySelector('[data-edit-document-ref]').value = doc.ref;
      document.querySelector('[data-edit-document-payment]').innerHTML = [
        '<option>Not linked</option>',
        ...getAllRequests(project).map((request) => `<option value="${request.ref}">${request.ref}</option>`),
      ].join('');
      document.querySelector('[data-edit-document-payment]').value = getAllRequests(project).find((request) => request.id === doc.linkedPayment)?.ref || 'Not linked';
      document.querySelector('[data-edit-document-package]').innerHTML = [
        '<option value="">Project level</option>',
        ...project.packages.map((pkg) => `<option value="${pkg.id}">${pkg.name}</option>`),
      ].join('');
      document.querySelector('[data-edit-document-package]').value = doc.packageId || '';
    }

    function closeModal(modal) {
      if (!modal) return;
      modal.classList.remove('is-open');
      modal.hidden = true;
    }

    function openModal(name) {
      const modal = document.querySelector(`[data-modal="${name}"]`);
      if (!modal) return;
      document.querySelectorAll('[data-modal].is-open').forEach(closeModal);
      modal.hidden = false;
      modal.classList.add('is-open');
      if (name === 'new-project') {
        renderMilestoneBuilder();
        renderNewProjectStep(1);
      }
      if (name === 'add-package') renderPackageMilestoneField();
    }

    document.querySelectorAll('[data-modal-target]').forEach((trigger) => {
      trigger.addEventListener('click', () => {
        prepareAddDocumentModal(trigger);
        openModal(trigger.dataset.modalTarget);
      });
    });

    document.addEventListener('click', (event) => {
      const trigger = event.target.closest('[data-modal-target]');
      if (!trigger) return;
      prepareAddDocumentModal(trigger);
      openModal(trigger.dataset.modalTarget);
    });

    document.addEventListener('click', (event) => {
      const modal = event.target.closest('[data-modal]');
      const button = event.target.closest('.modal-footer .btn');
      if (!modal || !button || button.matches('[data-modal-close], [data-new-project-next], [data-new-project-back]')) return;
      event.preventDefault();
      event.stopPropagation();
      handleModalSubmit(modal);
    });

    document.querySelector('[data-add-document-file]')?.addEventListener('change', (event) => {
      const file = event.target.files?.[0];
      const label = document.querySelector('[data-add-document-file-name]');
      if (label) label.textContent = file ? `${file.name} · ${formatFileSize(file.size)}` : '';
    });

    document.querySelectorAll('[data-modal]').forEach((modal) => {
      modal.addEventListener('click', (event) => {
        if (event.target === modal || event.target.closest('[data-modal-close]')) {
          closeModal(modal);
        }
      });
    });

    document.getElementById('role-toggle').addEventListener('click', () => {
      roleIndex = (roleIndex + 1) % roles.length;
      renderRole();
      maybeAnimateDashboardKpis();
    });

    document.getElementById('theme-toggle').addEventListener('click', () => {
      const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = nextTheme;
      localStorage.setItem('construkt-theme', nextTheme);
    });

    window.addEventListener('hashchange', renderRoute);

    applyInitialTheme();
    renderRole();
    renderDashboard();
    renderProjectsList();
    renderRoute();
    if (document.querySelector('[data-doc-filter="type"]')) {
      applyDocumentFilters();
    }
    syncProjectDetailEmptyStates();