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
      activeVariationId: null,
      chainEvents: [
        {
          id: 'chain-seed-001',
          label: 'Funds released',
          status: 'Confirmed',
          projectName: 'Demo Hospital Fit-Out',
          packageName: 'Foundation Pour - Bay A',
          packageId: 'wp-001',
          detail: 'Mock USDC released from package escrow to contractor wallet.',
          accountRef: 'escrow_wp_001',
          tx: 'demoRelease5J7kP9zQ2a',
          date: '2026-04-10T10:45:00',
        },
        {
          id: 'chain-seed-002',
          label: 'Approval recorded',
          status: 'Confirmed',
          projectName: 'Demo Hospital Fit-Out',
          packageName: 'Foundation Pour - Bay A',
          packageId: 'wp-001',
          detail: 'Project Manager approval recorded against the payment request account.',
          accountRef: 'approval_req_001_pm',
          tx: 'demoApproval8Lk2mN4v',
          date: '2026-04-09T14:20:00',
        },
        {
          id: 'chain-seed-003',
          label: 'Mock USDC funded',
          status: 'Confirmed',
          projectName: 'Demo Hospital Fit-Out',
          packageName: 'Foundation Pour - Bay A',
          packageId: 'wp-001',
          detail: 'Package escrow funded with mock USDC for the approved package cap.',
          accountRef: 'vault_wp_001',
          tx: 'demoFund3Aq9xR7p',
          date: '2026-04-08T09:05:00',
        },
      ],
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
                  id: 'req-fnd-000',
                  ref: 'INV-FND-000',
                  amount: 128000,
                  submittedBy: 'Daniel Okafor',
                  date: '2026-03-18',
                  status: 'Released',
                  pmApproved: true,
                  pmApprovedBy: 'Eleanor Lane',
                  pmApprovedDate: '2026-03-20',
                  fdApproved: true,
                  fdApprovedBy: 'Maya Shah',
                  fdApprovedDate: '2026-03-22',
                  documents: [],
                },
                {
                  id: 'req-001',
                  ref: 'INV-FND-001',
                  amount: 92400,
                  submittedBy: 'Daniel Okafor',
                  date: '2026-04-08',
                  status: 'Submitted',
                  pmApproved: false,
                  pmApprovedBy: '',
                  pmApprovedDate: '',
                  fdApproved: false,
                  fdApprovedBy: '',
                  fdApprovedDate: '',
                  documents: ['doc-001', 'doc-004', 'doc-005'],
                },
              ],
              milestones: [
                { name: 'Mobilisation', paymentDate: '22 Mar 2026', amount: 128000, status: 'paid' },
                { name: 'Foundation pour', paymentDate: '8 Apr 2026', amount: 92400, status: 'invoiced' },
                { name: 'Inspection sign-off', paymentDate: '20 Apr 2026', amount: 160000, status: 'uninvoiced' },
                { name: 'Retention release', paymentDate: '1 Aug 2027', amount: 259600, status: 'uninvoiced' },
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
          budget: 500000,
          startDate: '2026-01-10',
          endDate: '2027-03-01',
          team: [
            { name: 'Maya Shah', role: 'finance_director', org: 'Northstar Capital' },
            { name: 'Eleanor Lane', role: 'project_manager', org: 'Construct PM Ltd' },
            { name: 'Daniel Okafor', role: 'contractor', org: 'Okafor Builders Ltd' },
          ],
          packages: [
            {
              id: 'wp-201',
              name: 'Package 1 - Enabling Works',
              cap: 120000,
              funded: 120000,
              released: 120000,
              status: 'Completed',
              contractor: 'Daniel Okafor',
              contractModel: 'valuation',
              completionDate: '2026-03-18',
              requests: [
                {
                  id: 'req-201',
                  ref: 'INV-CLR-001',
                  amount: 120000,
                  submittedBy: 'Daniel Okafor',
                  date: '2026-03-10',
                  status: 'Released',
                  pmApproved: true,
                  pmApprovedBy: 'Eleanor Lane',
                  pmApprovedDate: '2026-03-12',
                  fdApproved: true,
                  fdApprovedBy: 'Maya Shah',
                  fdApprovedDate: '2026-03-15',
                  documents: [],
                },
              ],
            },
            {
              id: 'wp-202',
              name: 'Package 2 - Structural Repairs',
              cap: 95000,
              funded: 95000,
              released: 95000,
              status: 'Completed',
              contractor: 'Northline Structures',
              contractModel: 'valuation',
              completionDate: '2026-04-02',
              requests: [
                {
                  id: 'req-202',
                  ref: 'INV-CLR-002',
                  amount: 95000,
                  submittedBy: 'Northline Structures',
                  date: '2026-03-24',
                  status: 'Released',
                  pmApproved: true,
                  pmApprovedBy: 'Eleanor Lane',
                  pmApprovedDate: '2026-03-27',
                  fdApproved: true,
                  fdApprovedBy: 'Maya Shah',
                  fdApprovedDate: '2026-03-30',
                  documents: [],
                },
              ],
            },
            {
              id: 'wp-203',
              name: 'Package 3 - Reading Room Fit-Out',
              cap: 105000,
              funded: 105000,
              released: 62000,
              status: 'In Progress',
              contractor: 'Daniel Okafor',
              contractModel: 'valuation',
              completionDate: '2026-05-20',
              requests: [],
            },
            {
              id: 'wp-204',
              name: 'Package 4 - MEP Refurbishment',
              cap: 80000,
              funded: 40000,
              released: 0,
              status: 'Partially Funded',
              contractor: 'Northline Structures',
              contractModel: 'valuation',
              completionDate: '2026-06-18',
              requests: [
                {
                  id: 'req-204',
                  ref: 'INV-CLR-004',
                  amount: 40000,
                  submittedBy: 'Northline Structures',
                  date: '2026-04-12',
                  status: 'Submitted',
                  pmApproved: false,
                  fdApproved: false,
                  documents: [],
                },
              ],
            },
            {
              id: 'wp-205',
              name: 'Package 5 - Final Commissioning',
              cap: 100000,
              funded: 0,
              released: 0,
              status: 'Estimated',
              contractor: 'Unassigned estimate',
              contractModel: 'valuation',
              completionDate: '2027-02-15',
              requests: [],
            },
          ],
          milestones: [],
          auditLog: [
            { event: 'Package 1 enabling works released', actor: 'Maya Shah', date: '2026-03-15T10:20:00', type: 'released' },
            { event: 'Package 2 structural repairs released', actor: 'Maya Shah', date: '2026-03-30T14:05:00', type: 'released' },
            { event: 'Package 4 MEP invoice submitted for PM review', actor: 'Northline Structures', date: '2026-04-12T09:30:00', type: 'pending' },
          ],
        },
        {
          id: 'proj-003',
          name: 'Station Works',
          client: 'Network Rail',
          status: 'Active',
          contractModel: 'bespoke',
          contractRef: 'SW-088',
          budget: 650000,
          startDate: '2025-11-01',
          endDate: '2026-12-01',
          team: [
            { name: 'Maya Shah', role: 'finance_director', org: 'Northstar Capital' },
            { name: 'Eleanor Lane', role: 'project_manager', org: 'Construct PM Ltd' },
            { name: 'Northline Structures', role: 'contractor', org: 'Northline Structures' },
          ],
          packages: [
            {
              id: 'wp-301',
              name: 'Package 1 - Platform Survey',
              cap: 150000,
              funded: 150000,
              released: 150000,
              status: 'Completed',
              contractor: 'Northline Structures',
              contractModel: 'bespoke',
              completionDate: '2026-01-28',
              requests: [],
            },
            {
              id: 'wp-302',
              name: 'Package 2 - Trackside Civils',
              cap: 125000,
              funded: 125000,
              released: 88000,
              status: 'In Progress',
              contractor: 'Northline Structures',
              contractModel: 'bespoke',
              completionDate: '2026-05-08',
              requests: [],
            },
            {
              id: 'wp-303',
              name: 'Package 3 - Access Works',
              cap: 125000,
              funded: 60000,
              released: 0,
              status: 'Partially Funded',
              contractor: 'Unassigned estimate',
              contractModel: 'bespoke',
              completionDate: '2026-08-14',
              requests: [],
            },
          ],
          milestones: [],
          auditLog: [
            { event: 'Platform survey package completed', actor: 'Eleanor Lane', date: '2026-01-28T12:15:00', type: 'released' },
            { event: 'Trackside civils evidence pack requested', actor: 'Eleanor Lane', date: '2026-04-08T16:40:00', type: 'pending' },
          ],
        },
        {
          id: 'proj-004',
          name: 'Riverside School Extension',
          client: 'Borough Education Partnership',
          status: 'Completed',
          contractModel: 'milestone',
          contractRef: 'RSE-118',
          startDate: '2025-03-03',
          endDate: '2026-02-20',
          team: [
            { name: 'Maya Shah', role: 'finance_director', org: 'Northstar Capital' },
            { name: 'Eleanor Lane', role: 'project_manager', org: 'Construct PM Ltd' },
            { name: 'Daniel Okafor', role: 'contractor', org: 'Okafor Builders Ltd' },
          ],
          packages: [
            {
              id: 'wp-401',
              name: 'Groundworks and Drainage',
              cap: 280000,
              funded: 280000,
              released: 280000,
              status: 'Completed',
              contractor: 'Daniel Okafor',
              completionDate: '2025-07-18',
              requests: [
                {
                  id: 'req-401',
                  ref: 'INV-RSE-001',
                  amount: 280000,
                  submittedBy: 'Daniel Okafor',
                  date: '2025-07-10',
                  status: 'Released',
                  pmApproved: true,
                  pmApprovedBy: 'Eleanor Lane',
                  pmApprovedDate: '2025-07-12',
                  fdApproved: true,
                  fdApprovedBy: 'Maya Shah',
                  fdApprovedDate: '2025-07-14',
                  documents: [],
                },
              ],
            },
            {
              id: 'wp-402',
              name: 'Classroom Block Fit-Out',
              cap: 520000,
              funded: 520000,
              released: 520000,
              status: 'Completed',
              contractor: 'Northline Structures',
              completionDate: '2025-12-04',
              requests: [],
            },
            {
              id: 'wp-403',
              name: 'MEP Commissioning',
              cap: 310000,
              funded: 310000,
              released: 310000,
              status: 'Completed',
              contractor: 'Daniel Okafor',
              completionDate: '2026-02-14',
              requests: [],
            },
          ],
          milestones: [
            { id: 'ms-401', name: 'Groundworks Complete', targetDate: '2025-07-18', status: 'complete', packageIds: ['wp-401'] },
            { id: 'ms-402', name: 'Teaching Block Complete', targetDate: '2025-12-04', status: 'complete', packageIds: ['wp-402'] },
            { id: 'ms-403', name: 'Handover', targetDate: '2026-02-20', status: 'complete', packageIds: ['wp-403'] },
          ],
          auditLog: [
            { event: 'Final handover payment released', actor: 'Maya Shah', date: '2026-02-20T15:30:00', type: 'released' },
            { event: 'MEP commissioning certificate approved', actor: 'Eleanor Lane', date: '2026-02-14T12:00:00', type: 'released' },
            { event: 'Project marked complete', actor: 'Maya Shah', date: '2026-02-20T16:05:00', type: 'info' },
          ],
        },
        {
          id: 'proj-005',
          name: 'Canal Bridge Repair',
          client: 'City Highways Authority',
          status: 'Completed',
          contractModel: 'valuation',
          contractRef: 'CBR-077',
          startDate: '2025-06-16',
          endDate: '2026-01-30',
          team: [
            { name: 'Maya Shah', role: 'finance_director', org: 'Northstar Capital' },
            { name: 'Eleanor Lane', role: 'project_manager', org: 'Construct PM Ltd' },
            { name: 'Daniel Okafor', role: 'contractor', org: 'Okafor Builders Ltd' },
          ],
          packages: [
            {
              id: 'wp-501',
              name: 'Concrete Deck Repairs',
              cap: 360000,
              funded: 360000,
              released: 360000,
              status: 'Completed',
              contractor: 'Daniel Okafor',
              completionDate: '2025-11-21',
              requests: [
                {
                  id: 'req-501',
                  ref: 'INV-CBR-001',
                  amount: 360000,
                  submittedBy: 'Daniel Okafor',
                  date: '2025-11-14',
                  status: 'Released',
                  pmApproved: true,
                  pmApprovedBy: 'Eleanor Lane',
                  pmApprovedDate: '2025-11-17',
                  fdApproved: true,
                  fdApprovedBy: 'Maya Shah',
                  fdApprovedDate: '2025-11-19',
                  documents: ['doc-501', 'doc-502'],
                },
              ],
            },
            {
              id: 'wp-502',
              name: 'Steel Bearing Replacement',
              cap: 430000,
              funded: 430000,
              released: 430000,
              status: 'Completed',
              contractor: 'Northline Structures',
              completionDate: '2026-01-12',
              requests: [
                {
                  id: 'req-502',
                  ref: 'INV-CBR-002',
                  amount: 430000,
                  submittedBy: 'Northline Structures',
                  date: '2026-01-05',
                  status: 'Released',
                  pmApproved: true,
                  pmApprovedBy: 'Eleanor Lane',
                  pmApprovedDate: '2026-01-07',
                  fdApproved: true,
                  fdApprovedBy: 'Maya Shah',
                  fdApprovedDate: '2026-01-09',
                  documents: ['doc-503', 'doc-504'],
                },
              ],
            },
            {
              id: 'wp-503',
              name: 'Surfacing and Reopening',
              cap: 190000,
              funded: 190000,
              released: 190000,
              status: 'Completed',
              contractor: 'Daniel Okafor',
              completionDate: '2026-01-30',
              requests: [
                {
                  id: 'req-503',
                  ref: 'INV-CBR-003',
                  amount: 190000,
                  submittedBy: 'Daniel Okafor',
                  date: '2026-01-24',
                  status: 'Released',
                  pmApproved: true,
                  pmApprovedBy: 'Eleanor Lane',
                  pmApprovedDate: '2026-01-26',
                  fdApproved: true,
                  fdApprovedBy: 'Maya Shah',
                  fdApprovedDate: '2026-01-30',
                  documents: ['doc-505', 'doc-506'],
                },
              ],
            },
          ],
          milestones: [],
          auditLog: [
            { event: 'Final valuation released', actor: 'Maya Shah', date: '2026-01-30T11:25:00', type: 'released' },
            { event: 'Bridge reopened after completion inspection', actor: 'Eleanor Lane', date: '2026-01-29T09:40:00', type: 'info' },
          ],
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
          id: 'doc-004',
          name: 'Cube Test Results',
          type: 'Inspection Report',
          ref: 'DOC-CUB-022',
          uploadedBy: 'D. Okafor',
          date: '2026-04-08',
          version: 1,
          linkedPayment: 'req-001',
          projectId: 'proj-001',
          packageId: 'wp-001',
        },
        {
          id: 'doc-005',
          name: 'Site Photos and QA Pack',
          type: 'Photo Evidence',
          ref: 'DOC-QA-027',
          uploadedBy: 'D. Okafor',
          date: '2026-04-08',
          version: 1,
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
        {
          id: 'doc-501',
          name: 'Deck Repair Completion Certificate',
          type: 'Certificate',
          ref: 'DOC-CBR-014',
          uploadedBy: 'D. Okafor',
          date: '2025-11-14',
          version: 2,
          linkedPayment: 'req-501',
          projectId: 'proj-005',
          packageId: 'wp-501',
        },
        {
          id: 'doc-502',
          name: 'Concrete Cube Test Results',
          type: 'Inspection Report',
          ref: 'DOC-CBR-015',
          uploadedBy: 'E. Lane',
          date: '2025-11-16',
          version: 1,
          linkedPayment: 'req-501',
          projectId: 'proj-005',
          packageId: 'wp-501',
        },
        {
          id: 'doc-503',
          name: 'Bearing Replacement Sign-Off',
          type: 'Milestone Cert',
          ref: 'DOC-CBR-021',
          uploadedBy: 'Northline Structures',
          date: '2026-01-05',
          version: 3,
          linkedPayment: 'req-502',
          projectId: 'proj-005',
          packageId: 'wp-502',
        },
        {
          id: 'doc-504',
          name: 'Approved Payment Notice - Bearings',
          type: 'Payment Notice',
          ref: 'DOC-CBR-022',
          uploadedBy: 'M. Shah',
          date: '2026-01-09',
          version: 1,
          linkedPayment: 'req-502',
          projectId: 'proj-005',
          packageId: 'wp-502',
        },
        {
          id: 'doc-505',
          name: 'Surfacing Completion Photos',
          type: 'Photo Evidence',
          ref: 'DOC-CBR-029',
          uploadedBy: 'D. Okafor',
          date: '2026-01-24',
          version: 1,
          linkedPayment: 'req-503',
          projectId: 'proj-005',
          packageId: 'wp-503',
        },
        {
          id: 'doc-506',
          name: 'Final Reopening Certificate',
          type: 'Certificate',
          ref: 'DOC-CBR-030',
          uploadedBy: 'E. Lane',
          date: '2026-01-30',
          version: 2,
          linkedPayment: 'req-503',
          projectId: 'proj-005',
          packageId: 'wp-503',
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

    function demoTxSignature() {
      return 'demo' + Math.random().toString(16).slice(2, 10) + Date.now().toString(36).slice(-6);
    }

    function logChainAction(label, project, pkg, detail, accountRef = '') {
      const event = {
        id: 'chain-' + Date.now(),
        label,
        status: 'Confirmed',
        projectName: project?.name || 'Demo project',
        packageName: pkg?.name || 'Work package',
        packageId: pkg?.id || '',
        detail,
        accountRef: accountRef || `pda_${pkg?.id || 'demo'}`,
        tx: demoTxSignature(),
        date: new Date().toISOString(),
      };
      store.chainEvents.unshift(event);
      store.chainEvents = store.chainEvents.slice(0, 10);
      renderChainFeedback();
      return event;
    }

    function chainEventHtml(event) {
      const txUrl = `https://explorer.solana.com/tx/${event.tx}?cluster=devnet`;
      return `
        <article class="on-chain-feedback-item">
          <div class="on-chain-feedback-topline">
            <span class="on-chain-feedback-label">${escapeHtml(event.label)}</span>
            <span class="on-chain-feedback-status">${escapeHtml(event.status || 'Confirmed')}</span>
          </div>
          <div class="on-chain-feedback-meta">${escapeHtml(event.projectName)} · ${escapeHtml(event.packageName)}</div>
          <div class="on-chain-feedback-meta">${escapeHtml(event.detail)}</div>
          <div class="on-chain-feedback-meta">${escapeHtml(event.accountRef)} · ${formatDateTime(event.date)}</div>
          <a class="on-chain-feedback-link" href="${txUrl}" target="_blank" rel="noreferrer">View transaction</a>
        </article>
      `;
    }

    function renderChainFeedback() {
      const dashboardList = document.getElementById('chain-feedback-list');
      const packageList = document.getElementById('wp-chain-feedback-list');
      if (dashboardList) {
        dashboardList.innerHTML = store.chainEvents.slice(0, 4).map(chainEventHtml).join('') || '<p class="assignment-description">On-chain demo confirmations will appear here.</p>';
      }
      if (packageList) {
        const activePkg = activePackage();
        const packageEvents = activePkg
          ? store.chainEvents.filter((event) => event.packageId === activePkg.id || event.packageName === activePkg.name).slice(0, 4)
          : store.chainEvents.slice(0, 4);
        packageList.innerHTML = packageEvents.map(chainEventHtml).join('') || '<p class="assignment-description">No on-chain demo actions recorded for this package yet.</p>';
      }
    }

    const routes = {
      home: { layout: 'public', page: 'home' },
      dashboard2: { layout: 'app', page: 'dashboard2' },
      'chart-fullscreen': { layout: 'app', page: 'chart-fullscreen', nav: 'dashboard2' },
      'work-package-view': { layout: 'app', page: 'work-package-view', nav: 'dashboard2' },
      'upload-task': { layout: 'app', page: 'upload-task', nav: 'dashboard2' },
      'review-task': { layout: 'app', page: 'review-task', nav: 'dashboard2' },
      'response-task': { layout: 'app', page: 'response-task', nav: 'dashboard2' },
      projects: { layout: 'app', page: 'projects' },
      'project-detail': { layout: 'app', page: 'project-detail', nav: 'projects' },
      settings: { layout: 'app', page: 'settings' }
    };

    const routeAliases = {
      dashboard: 'dashboard2',
      'work-package-detail': 'work-package-view',
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

    const landingRoleToAppRole = {
      finance: 'finance_director',
      pm: 'project_manager',
      contractor: 'contractor',
    };

    function applyInitialTheme() {
      const storedTheme = localStorage.getItem('construkt-theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.dataset.theme = storedTheme || (prefersDark ? 'dark' : 'light');
    }

    function currentRoute() {
      const hash = window.location.hash.replace('#', '') || 'home';
      const canonical = routeAliases[hash] || hash;
      return routes[canonical] ? canonical : 'home';
    }

    function renderRoute() {
      const name = currentRoute();
      const rawName = window.location.hash.replace('#', '') || 'home';
      if (routeAliases[rawName] && window.location.hash !== `#${name}`) {
        window.history.replaceState(null, '', `#${name}`);
      }
      const route = routes[name];
      const publicScreen = document.getElementById('public-screen');
      const appScreen = document.getElementById('app-screen');

      publicScreen.classList.toggle('is-active', route.layout === 'public');
      appScreen.classList.toggle('is-active', route.layout === 'app');

      const homePage = document.getElementById('home-page');
      const signinPage = document.getElementById('signin-page');
      if (homePage) homePage.hidden = route.page !== 'home';
      if (signinPage) signinPage.hidden = route.page !== 'signin';

      document.querySelectorAll('[data-app-page]').forEach((page) => {
        page.hidden = page.dataset.appPage !== route.page;
      });

      document.querySelectorAll('[data-route-link]').forEach((link) => {
        link.classList.toggle('is-active', link.dataset.routeLink === (route.nav || route.page));
      });

      if (name === 'dashboard2') {
        renderDashboard2();
      }
      if (name === 'chart-fullscreen') {
        renderChartFullscreen();
      }
      if (name === 'upload-task') {
        renderUploadTask();
      }
      if (name === 'review-task') {
        renderReviewTask();
      }
      if (name === 'response-task') {
        renderResponseTask();
      }
      if (name === 'projects') {
        renderProjectsList();
        applyRoleUI(store.currentRole);
      }
      if (name === 'project-detail') {
        renderProjectDetail(store.currentProjectId || store.projects[0].id);
        syncProjectDetailEmptyStates();
      }
      if (name === 'work-package-view') {
        renderWorkPackageView();
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
      if (/(held|partially funded|in progress)/.test(value)) return 'chip-tone-warning';
      if (/(released|funded|approved|active|complete|completed)/.test(value)) return 'chip-tone-success';
      if (/(submitted|pending|under review)/.test(value)) return 'chip-tone-primary';
      if (/(rejected|locked|blocked)/.test(value)) return 'chip-tone-danger';
      return 'chip-tone-neutral';
    }

    function statusChip(status) {
      return `<span class="status-pill ${chipTone(status)}">${status}</span>`;
    }

    function hasAssignedContractor(pkg) {
      return Boolean(pkg?.contractor && pkg.contractor !== 'Unassigned estimate' && pkg.contractor !== 'Unassigned');
    }

    function financeApprovalStatus(pkg) {
      if (pkg?.financeApprovalStatus) return pkg.financeApprovalStatus;
      if (pkg?.funded > 0) return 'Escrow Locked';
      if (hasAssignedContractor(pkg) && pkg?.cap > 0) return 'Awaiting Finance Approval';
      return 'Estimate';
    }

    function packageActionCell(project, pkg) {
      const approval = financeApprovalStatus(pkg);
      if (store.currentRole === 'finance_director' && approval === 'Awaiting Finance Approval') {
        return `<button class="btn btn-primary small" type="button" onclick="approveWorkPackage('${project.id}', '${pkg.id}')">Approve escrow</button>`;
      }
      return `<a class="text-link" href="#work-package-view" data-open-work-package data-project-id="${project.id}" data-package-id="${pkg.id}" onclick="openWorkPackageView('${project.id}', '${pkg.id}', event); return false;">View</a>`;
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
      if (model === 'mixed') return 'Package-level';
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
      const projectComplete = isProjectComplete(project);
      const nodes = [];
      const cursor = new Date(`${project.startDate}T00:00:00`);
      const end = new Date(`${project.endDate}T00:00:00`);
      let quarter = 1;
      while (cursor <= end) {
        const iso = cursor.toISOString().split('T')[0];
        nodes.push({
          name: `Quarter ${quarter}`,
          targetDate: iso,
          status: projectComplete || new Date() >= cursor ? 'complete' : 'upcoming',
        });
        cursor.setMonth(cursor.getMonth() + 3);
        quarter += 1;
      }
      if (!nodes.some((node) => node.targetDate === project.endDate)) {
        nodes.push({ name: 'Final Valuation', targetDate: project.endDate, status: projectComplete || new Date() >= end ? 'complete' : 'upcoming' });
      }
      const firstUpcoming = nodes.find((node) => node.status === 'upcoming');
      if (firstUpcoming) firstUpcoming.status = 'in-progress';
      return nodes;
    }

    function buildBespokeTimeline(project) {
      return project.packages.map((pkg) => ({
        name: pkg.name,
        targetDate: project.endDate,
        status: pkg.status === 'Locked' ? 'blocked' : isPackageComplete(pkg) ? 'complete' : pkg.requests.length ? 'in-progress' : 'upcoming',
      }));
    }

    function getTimelineNodes(project) {
      if (project.milestones?.length) {
        if (project.contractModel === 'milestone') syncMilestoneStatuses(project);
        return project.milestones.map((milestone) => ({
          name: milestone.name,
          targetDate: milestone.targetDate,
          status: milestone.status,
        }));
      }
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

    function projectQuickActionTarget(project) {
      if (!project?.packages?.length) return null;
      return project.packages.find((pkg) => pkg.requests.some((request) => request.pmApproved && !request.fdApproved && request.status !== 'Rejected'))
        || project.packages.find((pkg) => (pkg.funded || 0) < (pkg.cap || 0))
        || project.packages[0];
    }

    function renderProjectQuickActions(project) {
      const card = document.querySelector('.project-detail-side .quick-actions');
      const context = document.getElementById('project-quick-actions-context');
      const fundButton = document.getElementById('project-quick-fund');
      const holdButton = document.getElementById('project-quick-hold');
      if (!card || !context || !fundButton || !holdButton) return;

      if (store.currentRole !== 'finance_director') {
        card.hidden = true;
        return;
      }

      const targetPkg = projectQuickActionTarget(project);
      if (!targetPkg) {
        card.hidden = true;
        return;
      }

      const remaining = Math.max((targetPkg.cap || 0) - (targetPkg.funded || 0), 0);
      card.hidden = false;
      context.textContent = remaining > 0
        ? `Actions for ${targetPkg.name}. ${formatGBP(remaining)} remains to be funded on this project package.`
        : `Actions for ${targetPkg.name}. Use these controls on the current project package.`;

      fundButton.dataset.projectId = project.id;
      fundButton.dataset.packageId = targetPkg.id;
      holdButton.dataset.projectId = project.id;
      holdButton.dataset.packageId = targetPkg.id;
      fundButton.textContent = `Fund ${targetPkg.name}`;
      holdButton.textContent = `Hold ${targetPkg.name}`;
    }

    function getAllRequests(project) {
      return project.packages.flatMap((pkg) => pkg.requests.map((request) => ({ ...request, package: pkg })));
    }

    function getCurrentUserRole(project) {
      return project.team.find((member) => member.name === store.currentUser.name && member.role === store.currentRole)?.role;
    }

    function contractorPackagesForProject(project) {
      return (project?.packages || []).filter((pkg) => pkg.contractor === store.currentUser.name);
    }

    function projectsForCurrentRole() {
      if (store.currentRole === 'finance_director') return store.projects;
      if (store.currentRole === 'contractor') {
        return store.projects.filter((project) => contractorPackagesForProject(project).length > 0);
      }
      return store.projects.filter((project) =>
        project.team.some((member) => member.name === store.currentUser.name && member.role === store.currentRole)
      );
    }

    function isProjectComplete(project) {
      const statusComplete = /complete|completed|closed/i.test(project.status || '');
      const packages = project.packages || [];
      const packagesComplete = packages.length > 0 && packages.every((pkg) =>
        /complete|completed|released/i.test(pkg.status || '') || ((pkg.released || 0) >= (pkg.cap || 0) && (pkg.cap || 0) > 0)
      );
      return statusComplete || packagesComplete;
    }

    function isPackageComplete(pkg) {
      return /complete|completed|released/i.test(pkg?.status || '') || ((pkg?.released || 0) >= (pkg?.cap || 0) && (pkg?.cap || 0) > 0);
    }

    function renderProjectsList() {
      const container = document.getElementById('projects-simple-list');
      if (!container) return;

      const projects = projectsForCurrentRole();
      if (!projects.length) {
        container.innerHTML = '<div class="contractor-package-empty">No assigned projects yet.</div>';
        return;
      }

      const projectsWithDueDates = projects.map((project) => {
        const relevantPackages = store.currentRole === 'contractor' ? contractorPackagesForProject(project) : project.packages;
        const dueDates = relevantPackages
          .map((pkg) => pkg.completionDate || project.endDate)
          .filter(Boolean)
          .map((date) => new Date(date))
          .filter((date) => !Number.isNaN(date.getTime()));
        const nextDue = dueDates.sort((a, b) => a - b)[0] || new Date(project.endDate || Date.now());
        const daysUntilTask = Math.ceil((nextDue - new Date()) / (1000 * 60 * 60 * 24));
        return { project, packageCount: relevantPackages.length, daysUntilTask };
      }).sort((a, b) => a.daysUntilTask - b.daysUntilTask);

      function renderProjectItems(items, completeGroup = false) {
        if (!items.length) {
          return `<div class="project-simple-empty">${completeGroup ? 'No completed projects yet.' : 'No ongoing projects right now.'}</div>`;
        }

        return items.map(({ project, packageCount, daysUntilTask }) => {
          let dueText = store.currentRole === 'contractor'
            ? `${packageCount} assigned package${packageCount !== 1 ? 's' : ''}`
            : `${packageCount} work package${packageCount !== 1 ? 's' : ''}`;
          let dueClass = '';

          if (completeGroup) {
            dueText += ` · completed ${formatDate(project.endDate)}`;
            dueClass = 'complete';
          } else if (daysUntilTask === 0) {
            dueText += ' · next due today';
            dueClass = 'urgent';
          } else if (daysUntilTask === 1) {
            dueText += ' · next due in 1 day';
            dueClass = 'urgent';
          } else if (daysUntilTask > 1 && daysUntilTask <= 3) {
            dueText += ` · next due in ${daysUntilTask} days`;
            dueClass = 'soon';
          } else if (daysUntilTask > 3) {
            dueText += ` · next due in ${daysUntilTask} days`;
          } else {
            dueText += ' · overdue';
            dueClass = 'urgent';
          }

          return `
            <div class="project-simple-item" onclick="showProjectDetail('${project.id}')">
              <span class="project-simple-name">${project.name}</span>
              <span class="project-simple-due ${dueClass}">${dueText}</span>
            </div>
          `;
        }).join('');
      }

      const ongoingProjects = projectsWithDueDates.filter(({ project }) => !isProjectComplete(project));
      const completedProjects = projectsWithDueDates
        .filter(({ project }) => isProjectComplete(project))
        .sort((a, b) => new Date(b.project.endDate || 0) - new Date(a.project.endDate || 0));

      container.innerHTML = `
        <section class="projects-simple-group">
          <div class="projects-simple-group-head">
            <h2>Ongoing Projects</h2>
            <span>${ongoingProjects.length} project${ongoingProjects.length !== 1 ? 's' : ''}</span>
          </div>
          <div class="projects-simple-group-list">
            ${renderProjectItems(ongoingProjects)}
          </div>
        </section>
        <section class="projects-simple-group">
          <div class="projects-simple-group-head">
            <h2>Completed Projects</h2>
            <span>${completedProjects.length} project${completedProjects.length !== 1 ? 's' : ''}</span>
          </div>
          <div class="projects-simple-group-list">
            ${renderProjectItems(completedProjects, true)}
          </div>
        </section>
      `;
    }

    function renderProjectDetail(projectId) {
      const project = projectFor(projectId);
      if (!project) return;
      store.currentProjectId = projectId;
      store.activeProjectId = projectId;
      const visiblePackages = store.currentRole === 'contractor' ? contractorPackagesForProject(project) : project.packages;
      const totals = visiblePackages.reduce((acc, pkg) => {
        acc.contractValue += pkg.cap || 0;
        acc.escrowFunded += pkg.funded || 0;
        acc.totalReleased += pkg.released || 0;
        return acc;
      }, { contractValue: 0, escrowFunded: 0, totalReleased: 0 });
      const contractValue = totals.contractValue || project.budget || 0;
      totals.remaining = contractValue - totals.totalReleased;
      const fundedPct = contractValue ? Math.round((totals.escrowFunded / contractValue) * 100) : 0;
      const releasedPct = contractValue ? Math.round((totals.totalReleased / contractValue) * 100) : 0;

      document.getElementById('project-title').textContent = project.name;
      document.querySelector('[data-project-detail-breadcrumb]').textContent = `Projects → ${project.name}`;
      document.getElementById('project-meta').innerHTML = `
        <span>${project.client}</span>
        ${statusChip(project.status)}
        <span class="model-badge">Reference: ${modelLabel(project.contractModel)}</span>
        <span>Started ${formatDate(project.startDate)}</span>
      `;
      document.getElementById('project-kpis').innerHTML = `
        <article class="kpi-card"><span class="kpi-label">Contract Value</span><strong class="kpi-value">${formatGBP(contractValue)}</strong><span class="kpi-note">${visiblePackages.length ? `Across ${visiblePackages.length} ${store.currentRole === 'contractor' ? 'assigned' : 'active'} packages` : 'Project budget before packages are added'}</span></article>
        <article class="kpi-card"><span class="kpi-label">Escrow Funded</span><strong class="kpi-value">${formatGBP(totals.escrowFunded)}</strong><div class="kpi-progress-pct-row"><span class="kpi-progress-pct">${fundedPct}% funded</span></div><div class="kpi-progress-track" aria-hidden="true"><span class="kpi-progress-fill kpi-progress-fill--funded" style="width:${fundedPct}%"></span></div><span class="kpi-note">${fundedPct}% currently locked</span></article>
        <article class="kpi-card" data-visible-to="finance_director project_manager"><span class="kpi-label">Total Released</span><strong class="kpi-value">${formatGBP(totals.totalReleased)}</strong><div class="kpi-progress-pct-row"><span class="kpi-progress-pct">${releasedPct}% released</span></div><div class="kpi-progress-track" aria-hidden="true"><span class="kpi-progress-fill kpi-progress-fill--released" style="width:${releasedPct}%"></span></div><span class="kpi-note">Paid against approved work</span></article>
        <article class="kpi-card"><span class="kpi-label">Remaining</span><strong class="kpi-value">${formatGBP(totals.remaining)}</strong><span class="kpi-note">Contract value less released</span></article>
      `;

      const modelColumn = 'Contract Type';
      const modelHeader = document.querySelector('[data-model-column-label]');
      if (modelHeader) modelHeader.textContent = modelColumn;
      const packageRow = (pkg, index) => `
        <tr class="clickable-row" data-open-work-package data-project-id="${project.id}" data-package-id="${pkg.id}" tabindex="0" role="link" aria-label="Open ${pkg.name} work package">
          <td><a class="text-link" href="#work-package-view" data-open-work-package data-project-id="${project.id}" data-package-id="${pkg.id}" onclick="openWorkPackageView('${project.id}', '${pkg.id}', event); return false;">${pkg.name}</a></td>
          <td>${formatGBP(pkg.cap)}</td>
          <td>${modelLabel(pkg.contractModel || project.contractModel || 'milestone')}</td>
          <td data-visible-to="finance_director project_manager">${formatGBP(pkg.funded)}</td>
          <td data-visible-to="finance_director project_manager">${formatGBP(pkg.released)}</td>
          <td>${pkg.requests.length ? `${pkg.requests.length} ${pkg.requests[pkg.requests.length - 1].status.toLowerCase()}` : '0 open'}</td>
          <td data-visible-to="finance_director project_manager">${statusChip(financeApprovalStatus(pkg))}</td>
          <td>${statusChip(pkg.status)}</td>
          <td>${packageActionCell(project, pkg)}</td>
        </tr>
      `;

      if (project.milestones?.length) {
        const assignedPackageIds = new Set(project.milestones.flatMap((milestone) => milestone.packageIds));
        const visiblePackageIds = new Set(visiblePackages.map((pkg) => pkg.id));
        const groupedRows = project.milestones.map((milestone) => {
          const packages = milestone.packageIds.map((id) => packageFor(project, id)).filter((pkg) => pkg && visiblePackageIds.has(pkg.id));
          if (!packages.length) return '';
          return `
            <tr>
              <td colspan="9" style="background:var(--color-surface-offset, var(--color-surface)); color:var(--color-text-faint); font-size:var(--text-xs); font-weight:500; text-transform:uppercase; letter-spacing:0.08em;">
                ${milestone.name} · ${formatDate(milestone.targetDate)} · ${statusChip(milestone.status)}
              </td>
            </tr>
            ${packages.map((pkg) => packageRow(pkg, project.packages.indexOf(pkg))).join('')}
          `;
        }).join('');
        const unassignedPackages = visiblePackages.filter((pkg) => !assignedPackageIds.has(pkg.id));
        const unassignedRows = unassignedPackages.length ? `
          <tr>
            <td colspan="9" style="background:var(--color-surface-offset, var(--color-surface)); color:var(--color-text-faint); font-size:var(--text-xs); font-weight:500; text-transform:uppercase; letter-spacing:0.08em;">
              Unassigned · No target date · ${statusChip('Pending')}
            </td>
          </tr>
          ${unassignedPackages.map((pkg) => packageRow(pkg, project.packages.indexOf(pkg))).join('')}
        ` : '';
        document.getElementById('packages-tbody').innerHTML = groupedRows + unassignedRows;
      } else {
        document.getElementById('packages-tbody').innerHTML = visiblePackages.map((pkg, index) => packageRow(pkg, index)).join('');
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
      renderProjectQuickActions(project);
      applyRoleUI(store.currentRole);
      syncProjectDetailEmptyStates();
    }

    function renderDashboard() {
      const kpiContainer = document.getElementById('dashboard-kpis');
      const mainCard = document.getElementById('dashboard-main-card');
      const activity = document.getElementById('dashboard-activity');
      if (!kpiContainer || !mainCard || !activity) return;

      document.querySelectorAll('[data-dashboard-role]').forEach((panel) => { panel.hidden = true; });
      const assignedProjects = projectsForCurrentRole();
      const packages = store.currentRole === 'contractor'
        ? assignedProjects.flatMap((project) => contractorPackagesForProject(project).map((pkg) => ({ ...pkg, project })))
        : assignedProjects.flatMap((project) => project.packages.map((pkg) => ({ ...pkg, project })));
      const totals = packages.reduce((acc, pkg) => {
        acc.contractValue += pkg.cap || 0;
        acc.escrowFunded += pkg.funded || 0;
        acc.totalReleased += pkg.released || 0;
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
        mainCard.innerHTML = assignment ? `<section class="assignment-card"><div class="assignment-grid"><div><div class="chip-row"><span class="assignment-chip">Current Assignment</span><span class="assignment-chip">${assignment.status}</span><span class="assignment-chip">${assignment.id.toUpperCase()}</span></div><h2 class="assignment-title">${assignment.name}</h2><p class="assignment-description">${assignment.project.name} · ${assignment.contractor}</p><div class="assignment-stats"><div class="assignment-tile"><span class="assignment-meta">Package Cap</span><strong>${formatGBP(assignment.cap)}</strong></div><div class="assignment-tile"><span class="assignment-meta">Released</span><strong>${formatGBP(assignment.released)}</strong></div></div><div class="assignment-actions"><button class="btn btn-primary" data-visible-to="contractor" data-modal-target="submit-invoice" type="button">Submit invoice</button><a class="text-link" href="#work-package-view" onclick="openWorkPackageView('${assignment.project.id}', '${assignment.id}'); return false;">Open package →</a></div></div></div></section>` : `<section class="assignment-card"><p class="assignment-description">No current assignment.</p></section>`;
      }

      const events = store.projects.flatMap((project) => project.auditLog.map((item) => ({ ...item, project: project.name }))).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
      activity.innerHTML = events.map((item) => `<li class="timeline-item"><span class="timeline-dot ${timelineDot(item.type)}"></span><div><span class="timeline-title">${item.event}</span><span class="timeline-meta">${item.project} · ${formatDateTime(item.date)}</span></div></li>`).join('');
      maybeAnimateDashboardKpis();
    }

    function packageStatusClass(status) {
      const normalized = String(status || '').toLowerCase().replace(/\s+/g, '-');
      if (['completed', 'in-progress', 'estimated', 'unallocated'].includes(normalized)) return normalized;
      return 'estimated';
    }

    function packageStatusLabel(status) {
      const normalized = packageStatusClass(status);
      if (normalized === 'completed') return 'Completed';
      if (normalized === 'in-progress') return 'In Progress';
      if (normalized === 'unallocated') return 'Unallocated';
      return 'Estimated';
    }

    function normalizeProjectFundingPackages(project) {
      if (Array.isArray(project.packages) && project.packages.length) {
        const packages = project.packages.map((pkg, index) => {
          const amount = pkg.cap || Math.max(pkg.funded || 0, pkg.released || 0);
          let status = 'estimated';
          if (isPackageComplete(pkg)) {
            status = 'completed';
          } else if ((pkg.requests || []).length || (pkg.funded || 0) > 0 || /funded|progress/i.test(pkg.status || '')) {
            status = 'in-progress';
          }
          return {
            id: pkg.id,
            projectId: project.id,
            name: pkg.name || `Package ${index + 1}`,
            amount,
            status,
          };
        });
        const total = project.budget || packages.reduce((sum, pkg) => sum + pkg.amount, 0);
        const allocated = packages.reduce((sum, pkg) => sum + pkg.amount, 0);
        const unallocated = total > allocated
          ? [{ name: 'Unallocated Budget', amount: total - allocated, status: 'unallocated' }]
          : [];
        return [...packages, ...unallocated];
      }

      const completed = (project.completedPackages || project.spentPayments || []).map((amount, index) => ({
        name: `Package ${index + 1}`,
        amount,
        status: 'completed',
      }));
      const inProgress = (project.inProgressPackages || project.pendingPayments || []).map((amount, index) => ({
        name: `Package ${completed.length + index + 1}`,
        amount,
        status: 'in-progress',
      }));
      let estimated = (project.estimatedPackages || []).map((amount, index) => ({
        name: `Package ${completed.length + inProgress.length + index + 1}`,
        amount,
        status: 'estimated',
      }));
      const projectTotal = project.total || project.budget || 0;
      const allocatedBeforeEstimated = [...completed, ...inProgress].reduce((sum, pkg) => sum + pkg.amount, 0);
      const remainingBudget = Math.max(projectTotal - allocatedBeforeEstimated, 0);

      if (!estimated.length && remainingBudget > 0) {
        const estimatedAmount = Math.round((remainingBudget * 0.65) / 1000) * 1000;
        if (estimatedAmount > 0) {
          estimated = [{ name: `Package ${completed.length + inProgress.length + 1}`, amount: Math.min(estimatedAmount, remainingBudget), status: 'estimated' }];
        }
      }

      const allocated = [...completed, ...inProgress, ...estimated].reduce((sum, pkg) => sum + pkg.amount, 0);
      const unallocatedAmount = Math.max(projectTotal - allocated, 0);
      const unallocated = unallocatedAmount > 0
        ? [{ name: 'Unallocated Budget', amount: unallocatedAmount, status: 'unallocated' }]
        : [];

      return [...completed, ...inProgress, ...estimated, ...unallocated];
    }

    function renderFundingSegments(project) {
      const packages = normalizeProjectFundingPackages(project);
      const total = project.total || project.budget || packages.reduce((sum, pkg) => sum + pkg.amount, 0) || 1;

      return packages.map((pkg) => {
        const percent = (pkg.amount / total) * 100;
        const statusClass = packageStatusClass(pkg.status);
        const label = packageStatusLabel(pkg.status);
        const tooltip = `${pkg.name} - ${formatGBP(pkg.amount)} - ${label}`;
        const segmentAttrs = `style="width: ${percent}%" data-tooltip="${escapeHtml(tooltip)}" aria-label="${escapeHtml(tooltip)}"`;

        if (statusClass === 'unallocated') {
          return `<div class="chart-bar-segment ${statusClass}" ${segmentAttrs}></div>`;
        }

        if (pkg.projectId && pkg.id) {
          return `<div class="chart-bar-segment ${statusClass}" ${segmentAttrs} onclick="openWorkPackageView('${pkg.projectId}', '${pkg.id}', event)"></div>`;
        }
        return `<div class="chart-bar-segment ${statusClass}" ${segmentAttrs} onclick="showWorkPackage('${project.name}', '${pkg.name}', '${formatGBP(pkg.amount)}', '${label}', event)"></div>`;
      }).join('');
    }

    function projectDaysUntilDue(project) {
      const dateValues = [
        ...(project.packages || []).map((pkg) => pkg.completionDate),
        project.endDate,
      ].filter(Boolean);
      const dates = dateValues
        .map((date) => new Date(`${date}T00:00:00`))
        .filter((date) => !Number.isNaN(date.getTime()));
      if (!dates.length) return 999;
      const nextDate = dates.sort((a, b) => a - b)[0];
      return Math.ceil((nextDate - new Date()) / (1000 * 60 * 60 * 24));
    }

    function assignedContractorPackages() {
      return store.projects.flatMap((project) =>
        project.packages
          .filter((pkg) => pkg.contractor === store.currentUser.name)
          .map((pkg) => ({ ...pkg, project }))
      );
    }

    function renderContractorPackageSegments(pkg) {
      const total = pkg.cap || 1;
      const openRequested = (pkg.requests || [])
        .filter((request) => !['Released', 'Rejected'].includes(request.status))
        .reduce((sum, request) => sum + (request.amount || 0), 0);
      const released = Math.min(pkg.released || 0, total);
      const requested = Math.min(openRequested, Math.max(total - released, 0));
      const remaining = Math.max(total - released - requested, 0);
      const segments = [];

      if (released > 0) segments.push({ className: 'completed', amount: released, label: 'Released' });
      if (requested > 0) segments.push({ className: 'in-progress', amount: requested, label: 'Invoice requested' });
      if (pkg.status === 'Locked') {
        segments.push({ className: 'contested', amount: Math.max(remaining, total * 0.12), label: 'Contested / held' });
      } else if (remaining > 0) {
        segments.push({ className: 'estimated', amount: remaining, label: 'Not invoiced' });
      }
      if (!segments.length) segments.push({ className: 'estimated', amount: total, label: 'Not invoiced' });

      return segments.map((segment) => {
        const width = Math.max((segment.amount / total) * 100, 6);
        const tooltip = `${segment.label} - ${pkg.name} - ${formatGBP(segment.amount)}`;
        return `<div class="chart-bar-segment ${segment.className}" style="width: ${width}%" data-tooltip="${escapeHtml(tooltip)}" aria-label="${escapeHtml(tooltip)}"></div>`;
      }).join('');
    }

    function renderContractorPackages(chartContent) {
      const assigned = assignedContractorPackages();
      if (!assigned.length) {
        chartContent.innerHTML = '<div class="contractor-package-empty">No assigned work packages yet.</div>';
        return;
      }

      const projects = [...new Set(assigned.map((pkg) => pkg.project.name))];
      chartContent.innerHTML = projects.map((projectName) => {
        const projectPackages = assigned.filter((pkg) => pkg.project.name === projectName);
        return `
          <div class="contractor-project-heading">${projectName}</div>
          ${projectPackages.map((pkg) => {
            const due = pkg.completionDate || pkg.project.endDate;
            return `
              <div class="chart-row">
                <div class="chart-label chart-label-clickable" onclick="openWorkPackageView('${pkg.project.id}', '${pkg.id}')">${pkg.name}</div>
                <div class="chart-bar-container" onclick="openWorkPackageView('${pkg.project.id}', '${pkg.id}')">
                  ${renderContractorPackageSegments(pkg)}
                </div>
                <div class="chart-value">${due ? formatDate(due) : modelLabel(pkg.contractModel)}</div>
              </div>
            `;
          }).join('')}
        `;
      }).join('');
    }

    function initChartTooltips() {
      if (document.querySelector('.chart-tooltip-floating')) return;

      const tooltip = document.createElement('div');
      tooltip.className = 'chart-tooltip-floating';
      tooltip.hidden = true;
      document.body.appendChild(tooltip);

      function positionTooltip(event) {
        const margin = 12;
        tooltip.hidden = false;
        const rect = tooltip.getBoundingClientRect();
        let left = event.clientX + margin;
        let top = event.clientY - rect.height - margin;

        if (left + rect.width > window.innerWidth - margin) {
          left = event.clientX - rect.width - margin;
        }
        if (top < margin) {
          top = event.clientY + margin;
        }

        tooltip.style.left = `${Math.max(margin, left)}px`;
        tooltip.style.top = `${Math.max(margin, top)}px`;
      }

      document.addEventListener('pointerover', (event) => {
        const segment = event.target.closest('.chart-bar-segment[data-tooltip]');
        if (!segment) return;
        tooltip.textContent = segment.dataset.tooltip || '';
        positionTooltip(event);
      });

      document.addEventListener('pointermove', (event) => {
        if (tooltip.hidden) return;
        if (!event.target.closest('.chart-bar-segment[data-tooltip]')) return;
        positionTooltip(event);
      });

      document.addEventListener('pointerout', (event) => {
        if (!event.target.closest('.chart-bar-segment[data-tooltip]')) return;
        if (event.relatedTarget?.closest?.('.chart-bar-segment[data-tooltip]')) return;
        tooltip.hidden = true;
      });

      document.addEventListener('click', () => {
        tooltip.hidden = true;
      });
    }

    function renderDashboard2() {
      const title = document.getElementById('dashboard2-role-title');
      const activity = document.getElementById('dashboard2-activity');
      const tasksList = document.getElementById('outstanding-tasks-list');
      const tasksCount = document.getElementById('outstanding-tasks-count');
      const chartContent = document.getElementById('dashboard2-chart-content');
      const chartTitle = document.querySelector('.dashboard2-chart-title');
      const chartLegend = document.querySelector('#dashboard2-chart-card .project-funding-legend');
      if (!activity || !tasksList || !tasksCount || !title || !chartContent) return;

      const roleLabel = roleFullLabel(store.currentRole);
      title.textContent = roleLabel;
      if (chartTitle) chartTitle.textContent = store.currentRole === 'contractor' ? 'Assigned Work Packages' : 'Project Funding Overview';
      if (chartLegend) {
        chartLegend.innerHTML = store.currentRole === 'contractor'
          ? `
            <span><i class="funding-legend-dot completed"></i>Released</span>
            <span><i class="funding-legend-dot in-progress"></i>Invoice Requested</span>
            <span><i class="funding-legend-dot estimated"></i>Not Invoiced</span>
            <span><i class="funding-legend-dot contested"></i>Contested / Held</span>
          `
          : `
            <span><i class="funding-legend-dot completed"></i>Completed</span>
            <span><i class="funding-legend-dot in-progress"></i>In Progress</span>
            <span><i class="funding-legend-dot estimated"></i>Estimated</span>
            <span><i class="funding-legend-dot unallocated"></i>Unallocated</span>
          `;
      }

      // Check if contractor role - render circular dial instead of bar chart
      if (store.currentRole === 'contractor') {
        renderContractorPackages(chartContent);
      } else {
        renderBarChart(chartContent);
      }
      renderChainFeedback();

      // Chart rendering functions
      function renderBarChart(chartContent) {
        const displayProjects = projectsForCurrentRole()
          .map((project) => ({ ...project, daysUntilDue: projectDaysUntilDue(project) }))
          .sort((a, b) => a.daysUntilDue - b.daysUntilDue)
          .slice(0, 7);

        chartContent.innerHTML = displayProjects.map((project) => {
          const daysText = project.daysUntilDue < 0
            ? 'Overdue'
            : project.daysUntilDue === 1
              ? '1 day'
              : `${project.daysUntilDue} days`;

          return `
            <div class="chart-row">
              <div class="chart-label chart-label-clickable" onclick="showProjectDetail('${project.id}')">${escapeHtml(project.name)}</div>
              <div class="chart-bar-container">
                ${renderFundingSegments(project)}
              </div>
              <div class="chart-value">${daysText}</div>
            </div>
          `;
        }).join('') || '<div class="contractor-package-empty">No active projects yet.</div>';
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
      const assignedProjects = projectsForCurrentRole();
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
        tasks = assignedContractorPackages().flatMap((pkg) => [
          {
            type: 'submit_invoice',
            title: `Submit invoice: ${pkg.name}`,
            meta: `${pkg.project.name} · ${formatGBP(Math.max(pkg.cap - pkg.released, 0))} remaining`,
            deadline: pkg.completionDate || pkg.project.endDate || new Date().toISOString(),
            action: 'Invoice',
            modal: 'submit-invoice',
            projectId: pkg.project.id,
            packageId: pkg.id,
          },
          {
            type: 'variation',
          title: `Submit variation request: ${pkg.name}`,
            meta: 'Separate cost or time claim',
            deadline: pkg.completionDate || pkg.project.endDate || new Date().toISOString(),
            action: 'Vary',
            modal: 'submit-variation',
            projectId: pkg.project.id,
            packageId: pkg.id,
          },
          {
            type: 'upload_doc',
            title: `Upload documents: ${pkg.name}`,
            meta: 'Certificates, site photos, progress reports',
            deadline: new Date().toISOString(),
            action: 'Upload',
            modal: 'add-document',
            projectId: pkg.project.id,
            packageId: pkg.id,
          },
        ]);
      }

      // Sort by deadline (soonest first)
      tasks.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

      // If no tasks, add dummy data for demonstration
      if (tasks.length === 0 && store.currentRole === 'contractor') {
        tasks = [{
          title: 'No assigned package actions',
          meta: 'Assigned work packages will appear here',
          deadline: new Date().toISOString(),
          action: 'Open',
        }];
      } else if (tasks.length === 0) {
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
        if (task.type === 'submit_doc' || task.type === 'upload_doc') {
          buttonClass += ' btn-upload'; // Blue
        } else if (task.type === 'review') {
          buttonClass += ' btn-review'; // Purple
        } else if (task.type === 'response' || task.type === 'variation') {
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
            <button class="${buttonClass}" data-task-type="${task.type || ''}" data-task-title="${task.title}" data-task-modal="${task.modal || ''}" data-task-project="${task.projectId || ''}" data-task-package="${task.packageId || ''}" type="button">${task.action}</button>
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
          const taskModal = btn.dataset.taskModal;
          const taskProject = btn.dataset.taskProject;
          const taskPackage = btn.dataset.taskPackage;

          // Store task info in sessionStorage
          sessionStorage.setItem('currentTask', JSON.stringify({
            type: taskType,
            title: taskTitle,
            projectId: taskProject,
            packageId: taskPackage,
          }));

          if (taskProject && taskPackage) {
            store.activeProjectId = taskProject;
            store.currentProjectId = taskProject;
            store.activePackageId = taskPackage;
            store.currentPackageId = taskPackage;
          }

          if (taskModal) {
            if (taskModal === 'add-document') {
              prepareAddDocumentModal({ dataset: { modalTarget: 'add-document', documentScope: 'package' } });
            }
            openModal(taskModal);
            return;
          }

          // Navigate to appropriate task page
          if (taskType === 'submit_doc' || taskType === 'upload_doc') {
            window.location.hash = 'upload-task';
          } else if (taskType === 'review') {
            window.location.hash = 'review-task';
          } else if (taskType === 'response') {
            window.location.hash = 'response-task';
          }
        };
      });

      // Setup chart expand button
      const expandBtn = document.getElementById('chart-expand-btn');
      if (expandBtn) {
        // Keep contractor package chart focused on the dashboard.
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

      const liveProjects = projectsForCurrentRole()
        .map((project) => ({ ...project, daysUntilDue: projectDaysUntilDue(project) }))
        .sort((a, b) => a.daysUntilDue - b.daysUntilDue);

      chartContent.innerHTML = liveProjects.map((project) => {
        const daysText = project.daysUntilDue < 0
          ? 'Overdue'
          : project.daysUntilDue === 1
            ? '1 day'
            : `${project.daysUntilDue} days`;
        return `
          <div class="chart-row">
            <div class="chart-label chart-label-clickable" onclick="showProjectDetail('${project.id}')">${escapeHtml(project.name)}</div>
            <div class="chart-bar-container">
              ${renderFundingSegments(project)}
            </div>
            <div class="chart-value">${daysText}</div>
          </div>
        `;
      }).join('') || '<div class="contractor-package-empty">No active projects yet.</div>';
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

    function renderReviewTask() {
      const backBtn = document.getElementById('review-task-back-btn');
      const cancelBtn = document.getElementById('review-cancel-btn');
      const submitBtn = document.getElementById('review-submit-btn');
      const titleElement = document.getElementById('review-task-title');
      const commentSection = document.getElementById('review-comment-section');
      const approveRadio = document.getElementById('review-approve');
      const rejectRadio = document.getElementById('review-reject');
      const suggestRadio = document.getElementById('review-suggest');

      // Load task info from sessionStorage
      const taskData = sessionStorage.getItem('currentTask');
      if (taskData && titleElement) {
        const task = JSON.parse(taskData);
        titleElement.textContent = task.title;
      }

      let selectedDecision = null;

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

      // Radio button change handlers
      const radioButtons = [approveRadio, rejectRadio, suggestRadio];
      radioButtons.forEach(radio => {
        if (radio) {
          radio.onchange = () => {
            selectedDecision = radio.value;
            updateSubmitButton();

            // Show/hide comment section for reject and suggest
            if (commentSection) {
              if (radio.value === 'reject' || radio.value === 'suggest') {
                commentSection.style.display = 'block';
              } else {
                commentSection.style.display = 'none';
              }
            }
          };
        }
      });

      function updateSubmitButton() {
        if (submitBtn) {
          submitBtn.disabled = !selectedDecision;
        }
      }

      // Submit button
      if (submitBtn) {
        submitBtn.onclick = () => {
          if (selectedDecision) {
            const commentInput = document.getElementById('review-comment-input');
            const comment = commentInput ? commentInput.value : '';

            let message = '';
            if (selectedDecision === 'approve') {
              message = 'Request approved successfully!';
            } else if (selectedDecision === 'reject') {
              message = 'Request rejected.';
            } else if (selectedDecision === 'suggest') {
              message = 'Alternative suggestion submitted.';
            }

            alert(message);
            window.location.hash = 'dashboard2';
          }
        };
      }
    }

    function renderResponseTask() {
      const backBtn = document.getElementById('response-task-back-btn');
      const dismissBtn = document.getElementById('response-dismiss-btn');
      const submitBtn = document.getElementById('response-submit-btn');
      const titleElement = document.getElementById('response-task-title');
      const messageInput = document.getElementById('response-message-input');

      // Load task info from sessionStorage
      const taskData = sessionStorage.getItem('currentTask');
      if (taskData && titleElement) {
        const task = JSON.parse(taskData);
        titleElement.textContent = task.title;
      }

      // Back button
      if (backBtn) {
        backBtn.onclick = () => {
          window.location.hash = 'dashboard2';
        };
      }

      // Dismiss button - goes back without sending response
      if (dismissBtn) {
        dismissBtn.onclick = () => {
          if (confirm('Are you sure you want to dismiss this message without responding?')) {
            alert('Message dismissed.');
            window.location.hash = 'dashboard2';
          }
        };
      }

      // Submit button - sends response (even if empty)
      if (submitBtn) {
        submitBtn.onclick = () => {
          const message = messageInput ? messageInput.value.trim() : '';

          if (message) {
            alert('Response sent successfully!');
          } else {
            alert('Response acknowledged.');
          }

          window.location.hash = 'dashboard2';
        };
      }
    }

    function escapeHtml(value) {
      return String(value ?? '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      }[char]));
    }

    function parsePackageAmount(value) {
      if (typeof value === 'number') return value;
      const raw = String(value || '').trim().toLowerCase();
      const numeric = parseFloat(raw.replace(/[^0-9.]/g, ''));
      if (!Number.isFinite(numeric)) return 0;
      if (raw.includes('m')) return numeric * 1000000;
      if (raw.includes('k')) return numeric * 1000;
      return numeric;
    }

    function milestoneStatusLabel(status) {
      const normalized = String(status || '').toLowerCase();
      if (normalized === 'paid') return 'Released';
      if (normalized === 'invoiced') return 'Awaiting Review';
      if (normalized === 'contested') return 'Locked';
      return 'Upcoming';
    }

    function milestoneStatusClass(status) {
      const normalized = String(status || '').toLowerCase();
      if (['paid', 'invoiced', 'contested'].includes(normalized)) return `is-${normalized}`;
      return 'is-uninvoiced';
    }

    function contractorForProject(projectName) {
      const contractors = {
        'Hospital Wing': 'MediBuild Contractors Ltd',
        'Office Tower': 'Summit Structures Ltd',
        'Civic Library Retrofit': 'BuildTech Solutions Ltd',
        'Station Works': 'Northline Structures',
      };
      return contractors[projectName] || 'BuildTech Solutions Ltd';
    }

    function buildPackageMilestones(pkg) {
      if (Array.isArray(pkg?.milestones) && pkg.milestones.length) {
        return pkg.milestones.map((milestone, index) => ({
          name: milestone.name || `Milestone ${index + 1}`,
          paymentDate: milestone.paymentDate || 'TBC',
          amount: parsePackageAmount(milestone.amount),
          status: milestone.status || 'uninvoiced',
        }));
      }

      const total = parsePackageAmount(pkg?.amount || pkg?.cap) || 120000;
      const amounts = [0.2, 0.3, 0.3, 0.2].map((share) => Math.round(total * share));
      const statusSets = {
        Completed: ['paid', 'paid', 'paid', 'paid'],
        'In Progress': ['paid', 'invoiced', 'contested', 'uninvoiced'],
        Estimated: ['uninvoiced', 'uninvoiced', 'uninvoiced', 'uninvoiced'],
        Spent: ['paid', 'paid', 'paid', 'paid'],
        Pending: ['paid', 'invoiced', 'contested', 'uninvoiced'],
        Unspent: ['uninvoiced', 'uninvoiced', 'uninvoiced', 'uninvoiced'],
      };
      const statuses = statusSets[pkg?.type] || statusSets['In Progress'];
      const packageName = pkg?.name || 'Work Package';

      return [
        {
          name: `${packageName} mobilisation`,
          paymentDate: 'Feb 20, 2026',
          amount: amounts[0],
          status: statuses[0],
        },
        {
          name: `${packageName} works complete`,
          paymentDate: 'Mar 15, 2026',
          amount: amounts[1],
          status: statuses[1],
        },
        {
          name: `${packageName} inspection and sign-off`,
          paymentDate: pkg?.paymentDate || 'Apr 20, 2026',
          amount: amounts[2],
          status: statuses[2],
        },
        {
          name: `${packageName} handover close-out`,
          paymentDate: 'May 10, 2026',
          amount: amounts[3],
          status: statuses[3],
        },
      ];
    }

    function renderMilestonePaymentSchedule(pkg) {
      const bar = document.getElementById('wp-milestone-bar');
      const details = document.getElementById('wp-milestone-details');
      if (!bar || !details) return;

      const milestones = buildPackageMilestones(pkg);
      const total = milestones.reduce((sum, milestone) => sum + (parsePackageAmount(milestone.amount) || 0), 0);
      const released = milestones
        .filter((milestone) => String(milestone.status || '').toLowerCase() === 'paid')
        .reduce((sum, milestone) => sum + (parsePackageAmount(milestone.amount) || 0), 0);
      const summary = document.getElementById('wp-milestone-summary');
      if (summary) {
        summary.innerHTML = `Cap ${formatGBP(total)} <span>Released ${formatGBP(released)}</span> <span>Remaining ${formatGBP(Math.max(total - released, 0))}</span>`;
      }

      bar.innerHTML = milestones.map((milestone, index) => {
        const amount = parsePackageAmount(milestone.amount);
        const width = total ? Math.max((amount / total) * 100, 8) : 100 / milestones.length;
        const statusClass = milestoneStatusClass(milestone.status);
        const label = `${milestoneStatusLabel(milestone.status)}: ${milestone.name}, ${formatGBP(amount)}, ${milestone.paymentDate}`;
        return `
          <div class="milestone-payment-segment ${statusClass}" style="width:${width}%" title="${escapeHtml(label)}" role="listitem" aria-label="${escapeHtml(label)}">
            <span class="milestone-payment-segment-name">${index + 1}. ${escapeHtml(milestone.name)}</span>
          </div>
        `;
      }).join('');

      details.innerHTML = milestones.map((milestone, index) => {
        const amount = parsePackageAmount(milestone.amount);
        const statusClass = milestoneStatusClass(milestone.status);
        return `
          <article class="milestone-detail-card">
            <div class="milestone-detail-topline">
              <span class="milestone-detail-status ${statusClass}">${milestoneStatusLabel(milestone.status)}</span>
              <span class="work-package-info-label">Milestone ${index + 1}</span>
            </div>
            <div class="milestone-detail-name">${escapeHtml(milestone.name)}</div>
            <div class="milestone-detail-meta">
              <span>Payment Date <strong>${escapeHtml(milestone.paymentDate)}</strong></span>
              <span>Amount <strong>${formatGBP(amount)}</strong></span>
            </div>
          </article>
        `;
      }).join('');
    }

    function renderWorkPackageActions(project, pkg) {
      const buttons = document.getElementById('wp-action-buttons');
      const reviewList = document.getElementById('wp-review-list');
      const roleLabelElement = document.getElementById('wp-action-role-label');
      if (!buttons || !reviewList) return;
      if (!project || !pkg) {
        buttons.innerHTML = '';
        reviewList.innerHTML = '<p class="assignment-description">Open a stored work package to manage actions.</p>';
        return;
      }
      if (roleLabelElement) roleLabelElement.textContent = `${roleFullLabel(store.currentRole)} actions`;

      const actionButtons = [];
      if (store.currentRole === 'contractor') {
        actionButtons.push(`<button class="btn btn-primary small" onclick="openPackageModal('${project.id}', '${pkg.id}', 'submit-invoice')" type="button">Submit Invoice</button>`);
        actionButtons.push(`<button class="btn btn-ghost small" onclick="openPackageModal('${project.id}', '${pkg.id}', 'submit-variation')" type="button">Submit Variation</button>`);
        actionButtons.push(`<button class="btn btn-ghost small" onclick="openPackageModal('${project.id}', '${pkg.id}', 'add-document')" type="button">Upload Documents</button>`);
      }
      if (store.currentRole === 'project_manager') {
        actionButtons.push(`<button class="btn btn-primary small" onclick="openPackageModal('${project.id}', '${pkg.id}', 'request-documents')" type="button">Request Documents</button>`);
        actionButtons.push(`<button class="btn btn-ghost small" onclick="openPackageModal('${project.id}', '${pkg.id}', 'submit-variation')" type="button">Submit Variation</button>`);
      }
      buttons.innerHTML = actionButtons.join('') || '<span class="assignment-description">No direct actions available for this role.</span>';

      const reviewRows = [];
      if (store.currentRole === 'project_manager') {
        (pkg.requests || []).filter((request) => request.status === 'Submitted').forEach((request) => {
          reviewRows.push(`
            <div class="work-package-review-item">
              <div><span class="work-package-review-title">Invoice ${request.ref}</span><span class="work-package-review-meta">${formatGBP(request.amount)} submitted by ${request.submittedBy}</span></div>
              <div class="work-package-review-actions">
                <button class="btn btn-primary small" onclick="openPackageModal('${project.id}', '${pkg.id}', 'approve-request', '${request.id}')" type="button">Approve</button>
                <button class="btn btn-ghost small" onclick="openPackageModal('${project.id}', '${pkg.id}', 'reject-request', '${request.id}')" type="button">Reject</button>
              </div>
            </div>
          `);
        });
        (pkg.variationRequests || []).filter((variation) => variation.status === 'Submitted').forEach((variation) => {
          reviewRows.push(`
            <div class="work-package-review-item">
              <div><span class="work-package-review-title">Variation ${variation.ref}</span><span class="work-package-review-meta">${variation.type} · ${formatGBP(variation.amountChange)} · ${variation.timeChange || 0} days</span></div>
              <div class="work-package-review-actions">
                <button class="btn btn-primary small" onclick="openPackageModal('${project.id}', '${pkg.id}', 'approve-variation', '', '${variation.id}')" type="button">Approve</button>
                <button class="btn btn-ghost small" onclick="openPackageModal('${project.id}', '${pkg.id}', 'reject-variation', '', '${variation.id}')" type="button">Reject</button>
              </div>
            </div>
          `);
        });
      }
      if (store.currentRole === 'finance_director') {
        (pkg.variationRequests || []).filter((variation) => variation.status === 'Pending Finance Approval').forEach((variation) => {
          reviewRows.push(`
            <div class="work-package-review-item">
              <div><span class="work-package-review-title">Finance approval: ${variation.ref}</span><span class="work-package-review-meta">${variation.type} · PM approved · contractor agreement follows</span></div>
              <div class="work-package-review-actions">
                <button class="btn btn-primary small" onclick="openPackageModal('${project.id}', '${pkg.id}', 'approve-variation', '', '${variation.id}')" type="button">Approve</button>
                <button class="btn btn-ghost small" onclick="openPackageModal('${project.id}', '${pkg.id}', 'reject-variation', '', '${variation.id}')" type="button">Reject</button>
              </div>
            </div>
          `);
        });
      }
      if (store.currentRole === 'contractor') {
        (pkg.variationRequests || []).filter((variation) => variation.status === 'Pending Contractor Agreement').forEach((variation) => {
          reviewRows.push(`
            <div class="work-package-review-item">
              <div><span class="work-package-review-title">Agree variation ${variation.ref}</span><span class="work-package-review-meta">${variation.type} · Finance approved</span></div>
              <div class="work-package-review-actions">
                <button class="btn btn-primary small" onclick="openPackageModal('${project.id}', '${pkg.id}', 'approve-variation', '', '${variation.id}')" type="button">Agree</button>
                <button class="btn btn-ghost small" onclick="openPackageModal('${project.id}', '${pkg.id}', 'reject-variation', '', '${variation.id}')" type="button">Reject</button>
              </div>
            </div>
          `);
        });
        (pkg.documentRequests || []).filter((request) => request.status === 'Requested').forEach((request) => {
          reviewRows.push(`
            <div class="work-package-review-item">
              <div><span class="work-package-review-title">Document requested: ${request.type}</span><span class="work-package-review-meta">${request.note || 'No note'}${request.dueDate ? ` · due ${formatDate(request.dueDate)}` : ''}</span></div>
              <div class="work-package-review-actions">
                <button class="btn btn-primary small" onclick="openPackageModal('${project.id}', '${pkg.id}', 'add-document')" type="button">Upload</button>
              </div>
            </div>
          `);
        });
      }

      reviewList.innerHTML = reviewRows.join('') || '<p class="assignment-description">No package items awaiting action.</p>';
    }

    function renderWorkPackageViewDocuments(project, pkg) {
      const list = document.getElementById('work-package-docs-list');
      if (!list) return;
      const docs = project && pkg ? store.documents.filter((doc) => doc.projectId === project.id && doc.packageId === pkg.id) : [];
      if (!docs.length) {
        list.innerHTML = '<div class="records-empty is-visible"><h3 class="records-empty__title">No documents uploaded</h3><p class="records-empty__body">Package evidence and certificates will appear here.</p></div>';
        return;
      }
      list.innerHTML = docs.map((doc) => `
        <div class="wp-doc-item">
          <div class="wp-doc-icon">${escapeHtml((doc.type || 'Doc').slice(0, 3).toUpperCase())}</div>
          <div class="wp-doc-details">
            <div class="wp-doc-name">${escapeHtml(doc.name)}</div>
            <div class="wp-doc-meta">${escapeHtml(doc.type)} · ${formatDate(doc.date)} · ${escapeHtml(doc.ref)}${doc.milestoneRef ? ` · ${escapeHtml(doc.milestoneRef)}` : ''}</div>
          </div>
          <button class="btn btn-ghost small" type="button">View</button>
        </div>
      `).join('');
    }

    function renderWorkPackageViewTimeline(project, pkg) {
      const list = document.getElementById('work-package-timeline-list');
      if (!list || !project || !pkg) return;
      const packageAudit = project.auditLog.filter((item) => item.event.includes(pkg.name) || item.event.toLowerCase().includes(pkg.name.split(' ')[0].toLowerCase()));
      const rows = packageAudit.length ? packageAudit : [
        { event: `${pkg.name} created`, date: project.startDate, type: 'info' },
      ];
      list.innerHTML = rows.map((item) => `
        <li class="wp-timeline-item">
          <span class="wp-timeline-dot ${timelineDot(item.type) || 'pending'}"></span>
          <div class="wp-timeline-content">
            <span class="wp-timeline-title">${escapeHtml(item.event)}</span>
            <span class="wp-timeline-meta">${formatDateTime(item.date)}</span>
          </div>
        </li>
      `).join('');
    }

    function latestPackageRequest(pkg) {
      return pkg?.requests?.[pkg.requests.length - 1] || null;
    }

    function packageDocs(project, pkg) {
      if (!project || !pkg) return [];
      return store.documents.filter((doc) => doc.projectId === project.id && doc.packageId === pkg.id);
    }

    function requestDocs(project, request) {
      if (!project || !request) return [];
      const refs = new Set(request.documents || []);
      return store.documents.filter((doc) => doc.projectId === project.id && (refs.has(doc.id) || doc.linkedPayment === request.id));
    }

    function renderWorkPackageHeader(project, pkg) {
      const title = document.getElementById('work-package-view-title');
      const crumb = document.getElementById('wp-breadcrumb');
      const meta = document.getElementById('wp-view-meta');
      if (title) title.textContent = pkg?.name || 'Work Package';
      if (crumb) crumb.textContent = `Projects -> ${project?.name || 'Project'} -> ${pkg?.name || 'Work Package'}`;
      if (meta) {
        meta.innerHTML = `
          ${statusChip(pkg?.status || 'Pending')}
          <span>${escapeHtml(project?.name || 'Project')}</span>
          <span>${escapeHtml(pkg?.contractor || 'Unassigned contractor')}</span>
          <span>${escapeHtml(pkg?.id?.toUpperCase() || 'WP')}</span>
        `;
      }
    }

    function workPackageCurrentAction(project, pkg) {
      const request = latestPackageRequest(pkg);
      const docRequest = (pkg.documentRequests || []).find((item) => item.status === 'Requested');
      const variation = (pkg.variationRequests || []).find((item) =>
        store.currentRole === 'project_manager'
          ? item.status === 'Submitted'
          : store.currentRole === 'finance_director'
            ? item.status === 'Pending Finance Approval'
            : item.status === 'Pending Contractor Agreement'
      );

      if (store.currentRole === 'project_manager' && request && !request.pmApproved && request.status === 'Submitted') {
        return {
          eyebrow: 'Project Manager',
          title: 'Review submitted evidence',
          body: `Invoice ${request.ref} is waiting for PM approval.`,
          primary: { label: 'Approve request', modal: 'approve-request', requestId: request.id },
          secondary: { label: 'Reject', modal: 'reject-request', requestId: request.id },
          link: 'Open evidence pack ->',
        };
      }
      if (store.currentRole === 'finance_director' && request && request.pmApproved && !request.fdApproved && request.status !== 'Rejected') {
        return {
          eyebrow: 'Finance Director',
          title: 'Release-ready payment',
          body: `${request.ref} has PM approval and can be checked for release.`,
          primary: { label: 'Release funds', modal: 'release-funds', requestId: request.id },
          secondary: { label: 'Place hold', modal: 'place-hold' },
          link: 'Review chain state ->',
        };
      }
      if (store.currentRole === 'finance_director' && (pkg.funded || 0) < (pkg.cap || 0)) {
        return {
          eyebrow: 'Finance Director',
          title: 'Fund remaining escrow',
          body: `${formatGBP(Math.max((pkg.cap || 0) - (pkg.funded || 0), 0))} remains to be locked for this package.`,
          primary: { label: 'Fund escrow', modal: 'fund-package' },
          secondary: { label: 'Place hold', modal: 'place-hold' },
          link: 'View funding history ->',
        };
      }
      if (store.currentRole === 'contractor' && docRequest) {
        return {
          eyebrow: 'Contractor',
          title: `Upload ${docRequest.type}`,
          body: docRequest.note || 'The project manager has requested supporting evidence.',
          primary: { label: 'Add document', modal: 'add-document' },
          secondary: { label: 'Submit variation', modal: 'submit-variation' },
          link: docRequest.dueDate ? `Due ${formatDate(docRequest.dueDate)}` : 'Open request ->',
        };
      }
      if (store.currentRole === 'contractor') {
        return {
          eyebrow: 'Contractor',
          title: request ? 'Track payment request' : 'Prepare payment request',
          body: request ? `${request.ref} is currently ${request.status.toLowerCase()}.` : 'Add evidence and submit an invoice when the package stage is ready.',
          primary: { label: request ? 'Add document' : 'Submit invoice', modal: request ? 'add-document' : 'submit-invoice' },
          secondary: { label: 'Submit variation', modal: 'submit-variation' },
          link: 'Open evidence pack ->',
        };
      }
      if (variation) {
        return {
          eyebrow: roleFullLabel(store.currentRole),
          title: `Review variation ${variation.ref}`,
          body: `${variation.type} request for ${formatGBP(variation.amountChange)} needs a decision.`,
          primary: { label: store.currentRole === 'contractor' ? 'Agree variation' : 'Approve variation', modal: 'approve-variation', variationId: variation.id },
          secondary: { label: 'Reject', modal: 'reject-variation', variationId: variation.id },
          link: 'Open variation details ->',
        };
      }
      return {
        eyebrow: roleFullLabel(store.currentRole),
        title: 'No blocking action',
        body: 'This package is up to date for your current role.',
        primary: store.currentRole === 'project_manager'
          ? { label: 'Request documents', modal: 'request-documents' }
          : { label: 'Add document', modal: 'add-document' },
        secondary: null,
        link: 'View audit trail ->',
      };
    }

    function actionButtonHtml(project, pkg, action, tone = 'primary') {
      if (!action) return '';
      const variationArg = action.variationId ? `, '', '${action.variationId}'` : '';
      const requestArg = action.requestId ? `, '${action.requestId}'` : '';
      return `<button class="btn btn-${tone} small" onclick="openPackageModal('${project.id}', '${pkg.id}', '${action.modal}'${requestArg}${variationArg})" type="button">${escapeHtml(action.label)}</button>`;
    }

    function renderWorkPackageCurrentAction(project, pkg) {
      const card = document.getElementById('wp-current-action-card');
      if (!card || !project || !pkg) return;
      const action = workPackageCurrentAction(project, pkg);
      const actionLink = action.primary?.modal === 'approve-request'
        ? `<button class="text-link evidence-action-link" onclick="openPackageModal('${project.id}', '${pkg.id}', 'approve-request', '${action.primary.requestId || ''}')" type="button">${escapeHtml(action.link)}</button>`
        : `<a class="text-link" href="#work-package-view">${escapeHtml(action.link)}</a>`;
      card.innerHTML = `
        <span class="work-package-action-eyebrow">${escapeHtml(action.eyebrow)}</span>
        <h2>${escapeHtml(action.title)}</h2>
        <p>${escapeHtml(action.body)}</p>
        <div class="work-package-current-action-buttons">
          ${actionButtonHtml(project, pkg, action.primary, 'primary')}
          ${action.secondary ? actionButtonHtml(project, pkg, action.secondary, 'ghost') : ''}
        </div>
        ${actionLink}
      `;
    }

    function buildWorkPackageTasks(project, pkg) {
      const docs = packageDocs(project, pkg);
      const request = latestPackageRequest(pkg);
      const hasCert = docs.some((doc) => /cert|notice|sign-off/i.test(doc.type || doc.name));
      const hasPhotos = docs.some((doc) => /photo|evidence/i.test(doc.type || doc.name));
      const packageComplete = isPackageComplete(pkg);
      const baseOwner = pkg.contractor || 'Site team';
      const reviewStatus = request?.status === 'Released'
        ? 'Released'
        : request?.pmApproved
          ? 'Pending Finance Review'
          : request
            ? 'In Review'
            : 'Upcoming';
      const requestNote = request
        ? request.pmApproved
          ? `${formatGBP(request.amount)} awaiting finance`
          : `${formatGBP(request.amount)} awaiting PM review`
        : 'Not invoiced yet';
      return [
        {
          title: `${pkg.name.split(' ')[0]} inspection`,
          owner: 'Eleanor Lane',
          status: hasCert || packageComplete ? 'Complete' : request ? 'In Review' : 'Upcoming',
          note: hasCert ? 'Evidence uploaded' : 'Requires certificate',
        },
        {
          title: 'Works execution record',
          owner: baseOwner,
          status: (pkg.released || 0) > 0 || request ? 'Complete' : 'Upcoming',
          note: request ? `Linked to ${request.ref}` : 'Before first invoice',
        },
        {
          title: 'Test results and QA pack',
          owner: baseOwner,
          status: docs.length >= 2 ? 'Submitted' : 'In Review',
          note: docs.length ? `${docs.length} document${docs.length === 1 ? '' : 's'} attached` : 'Upload required',
        },
        {
          title: 'Payment request review',
          owner: request?.pmApproved ? 'Maya Shah' : 'Eleanor Lane',
          status: reviewStatus,
          note: requestNote,
        },
        {
          title: 'Snagging close-out',
          owner: 'Site team',
          status: packageComplete ? 'Complete' : hasPhotos ? 'Submitted' : 'Upcoming',
          note: hasPhotos ? 'Photo evidence ready' : 'Before release',
        },
      ];
    }

    function renderWorkPackageTasks(project, pkg) {
      const list = document.getElementById('wp-task-list');
      const summary = document.getElementById('wp-task-summary');
      if (!list || !project || !pkg) return;
      const tasks = buildWorkPackageTasks(project, pkg);
      if (summary) summary.textContent = `${tasks.filter((task) => /complete|submitted|released/i.test(task.status)).length} of ${tasks.length} moving`;
      list.innerHTML = tasks.map((task) => `
        <article class="work-package-task-item">
          <span class="work-package-task-icon" aria-hidden="true"></span>
          <div class="work-package-task-copy">
            <strong>${escapeHtml(task.title)}</strong>
            <span>${escapeHtml(task.owner)} &middot; ${escapeHtml(task.note)}</span>
          </div>
          ${statusChip(task.status)}
        </article>
      `).join('');
    }

    function approvalStepClass(request, step) {
      if (!request) return step === 'submitted' ? 'current' : 'pending';
      if (step === 'submitted') return 'complete';
      if (step === 'pm') {
        if (request.status === 'Rejected') return 'blocked';
        return request.pmApproved ? 'complete' : 'current';
      }
      if (step === 'finance') {
        if (request.fdApproved) return 'complete';
        return request.pmApproved ? 'current' : 'pending';
      }
      if (step === 'released') return request.status === 'Released' ? 'complete' : 'pending';
      return 'pending';
    }

    function renderWorkPackageRequest(project, pkg) {
      const card = document.getElementById('wp-current-request-card');
      if (!card || !project || !pkg) return;
      const request = latestPackageRequest(pkg);
      if (!request) {
        card.innerHTML = `
          <div class="card-head"><h2>Current Payment Request</h2>${statusChip('Not Submitted')}</div>
          <div class="records-empty is-visible">
            <h3 class="records-empty__title">No invoice submitted yet</h3>
            <p class="records-empty__body">When the contractor submits a payment request, the approval flow will appear here.</p>
          </div>
        `;
        return;
      }
      const docs = requestDocs(project, request);
      card.innerHTML = `
        <div class="work-package-request-head">
          <div>
            <span class="work-package-info-label">Current Payment Request</span>
            <h2>${escapeHtml(request.ref)}</h2>
          </div>
          ${statusChip(request.status)}
        </div>
        <div class="work-package-request-amount">${formatGBP(request.amount)}</div>
        <p class="assignment-description">Submitted by ${escapeHtml(request.submittedBy)} on ${formatDate(request.date)} for approved package works and supporting evidence.</p>
        <div class="work-package-doc-chip-row">
          ${docs.length ? docs.map((doc) => `<span class="document-chip">${escapeHtml(doc.name)}</span>`).join('') : '<span class="document-chip">No linked documents yet</span>'}
        </div>
        <div class="work-package-approval-flow" aria-label="Approval flow">
          ${[
            ['Submitted', 'submitted'],
            ['PM Review', 'pm'],
            ['Finance Review', 'finance'],
            ['Released', 'released'],
          ].map(([label, key]) => `<div class="work-package-approval-step is-${approvalStepClass(request, key)}"><span></span><strong>${label}</strong></div>`).join('')}
        </div>
      `;
    }

    function renderPackageSnapshot(project, pkg) {
      const card = document.getElementById('wp-package-snapshot');
      if (!card || !project || !pkg) return;
      const remaining = Math.max((pkg.cap || 0) - (pkg.released || 0), 0);
      card.innerHTML = `
        <h2 class="work-package-info-heading">Package Snapshot</h2>
        <div class="work-package-info-grid is-rows">
          <div class="work-package-info-item"><span>Package cap</span><strong>${formatGBP(pkg.cap || 0)}</strong></div>
          <div class="work-package-info-item"><span>Escrow funded</span><strong>${formatGBP(pkg.funded || 0)}</strong></div>
          <div class="work-package-info-item"><span>Released</span><strong>${formatGBP(pkg.released || 0)}</strong></div>
          <div class="work-package-info-item"><span>Remaining</span><strong>${formatGBP(remaining)}</strong></div>
          <div class="work-package-info-item"><span>Contractor</span><strong>${escapeHtml(pkg.contractor || 'Unassigned')}</strong></div>
          <div class="work-package-info-item"><span>PM</span><strong>${escapeHtml(project.team.find((member) => member.role === 'project_manager')?.name || 'Eleanor Lane')}</strong></div>
          <div class="work-package-info-item"><span>Target completion</span><strong>${formatDate(pkg.completionDate || project.endDate)}</strong></div>
        </div>
      `;
    }

    function renderPaymentReadiness(project, pkg) {
      const card = document.getElementById('wp-payment-readiness');
      if (!card || !project || !pkg) return;
      const docs = packageDocs(project, pkg);
      const request = latestPackageRequest(pkg);
      const packageEvents = store.chainEvents.filter((event) => event.packageId === pkg.id || event.packageName === pkg.name);
      const blockers = [];
      if ((pkg.funded || 0) < (request?.amount || 0)) blockers.push('Escrow underfunded');
      if (docs.length < 3 && !isPackageComplete(pkg)) blockers.push('Supporting documents still light');
      if (request && !request.pmApproved) blockers.push('PM review pending');
      if (pkg.status === 'Locked') blockers.push('Hold is active');
      card.innerHTML = `
        <h2 class="work-package-info-heading">Payment Readiness</h2>
        <div class="work-package-readiness-list">
          <div><span>Escrow</span>${statusChip((pkg.funded || 0) >= (pkg.cap || 0) ? 'Funded' : 'Partially Funded')}</div>
          <div><span>Documents</span><strong>${docs.length} uploaded</strong></div>
          <div><span>Approval</span>${statusChip(request?.status || 'Not Submitted')}</div>
          <div><span>Hold</span>${statusChip(pkg.status === 'Locked' ? 'Locked' : 'Active')}</div>
          <div><span>Chain records</span><strong>${packageEvents.length} events recorded</strong></div>
          <div><span>Release blocker</span><strong>${escapeHtml(blockers[0] || 'No blocker for your role')}</strong></div>
        </div>
      `;
    }

    function renderWorkPackageRecords(project, pkg) {
      const content = document.getElementById('wp-tab-content');
      if (!content || !project || !pkg) return;
      const activeTab = store.activeWorkPackageTab || 'audit';
      document.querySelectorAll('[data-wp-tab]').forEach((tab) => tab.classList.toggle('is-active', tab.dataset.wpTab === activeTab));
      if (activeTab === 'documents') {
        const docs = packageDocs(project, pkg);
        content.innerHTML = docs.length ? `
          <div class="work-package-docs-list">
            ${docs.map((doc) => `
              <div class="wp-doc-item">
                <div class="wp-doc-icon">${escapeHtml((doc.type || 'Doc').slice(0, 3).toUpperCase())}</div>
                <div class="wp-doc-details">
                  <div class="wp-doc-name">${escapeHtml(doc.name)}</div>
                  <div class="wp-doc-meta">${escapeHtml(doc.type)} &middot; ${formatDate(doc.date)} &middot; ${escapeHtml(doc.ref)} &middot; V${doc.version}</div>
                </div>
                <a class="text-link" href="#">View</a>
              </div>
            `).join('')}
          </div>
        ` : '<div class="records-empty is-visible"><h3 class="records-empty__title">No documents uploaded</h3><p class="records-empty__body">Package evidence and certificates will appear here.</p></div>';
        return;
      }
      if (activeTab === 'payments') {
        const payments = pkg.requests || [];
        content.innerHTML = payments.length ? `
          <div class="table-card"><table class="action-table"><thead><tr><th>Invoice</th><th>Amount</th><th>Submitted</th><th>Status</th><th>Chain</th></tr></thead><tbody>
            ${payments.map((request) => `<tr><td>${escapeHtml(request.ref)}</td><td>${formatGBP(request.amount)}</td><td>${formatDate(request.date)}</td><td>${statusChip(request.status)}</td><td><a class="text-link" href="#">View on chain -></a></td></tr>`).join('')}
          </tbody></table></div>
        ` : '<div class="records-empty is-visible"><h3 class="records-empty__title">No payments recorded</h3><p class="records-empty__body">Payment history will appear as invoices are approved.</p></div>';
        return;
      }
      const packageAudit = project.auditLog.filter((item) => item.event.includes(pkg.name) || item.event.toLowerCase().includes(pkg.name.split(' ')[0].toLowerCase()));
      const rows = packageAudit.length ? packageAudit : [
        { event: `${pkg.name} created`, actor: project.team[0]?.name || 'Construkt', date: project.startDate, type: 'info' },
        latestPackageRequest(pkg) ? { event: `Invoice ${latestPackageRequest(pkg).ref} submitted`, actor: latestPackageRequest(pkg).submittedBy, date: latestPackageRequest(pkg).date, type: 'pending' } : null,
      ].filter(Boolean);
      content.innerHTML = `<ul class="work-package-timeline-list">${rows.map((item) => `
        <li class="wp-timeline-item">
          <span class="wp-timeline-dot ${timelineDot(item.type) || 'pending'}"></span>
          <div class="wp-timeline-content">
            <span class="wp-timeline-title">${escapeHtml(item.event)}</span>
            <span class="wp-timeline-meta">${escapeHtml(item.actor || 'Construkt')} &middot; ${formatDateTime(item.date)}</span>
          </div>
        </li>
      `).join('')}</ul>`;
    }

    function activeRequestContext() {
      const project = projectFor(store.activeProjectId || store.currentProjectId);
      const pkg = packageFor(project, store.activePackageId || store.currentPackageId);
      const request = pkg?.requests.find((item) => item.id === store.activeRequestId) || latestPackageRequest(pkg);
      return { project, pkg, request };
    }

    function evidenceDocStatus(doc) {
      if (/cube|test|inspection/i.test(`${doc?.name || ''} ${doc?.type || ''}`)) return 'Needs check';
      return 'Ready';
    }

    function renderEvidenceReviewModal() {
      const container = document.querySelector('[data-evidence-review]');
      if (!container) return;
      const { project, pkg, request } = activeRequestContext();
      if (!project || !pkg || !request) {
        container.innerHTML = '<p class="assignment-description">Open a payment request to review its evidence pack.</p>';
        return;
      }
      const linkedDocs = requestDocs(project, request);
      const docs = linkedDocs.length ? linkedDocs : packageDocs(project, pkg);
      const activeDoc = docs.find((doc) => doc.id === store.activeEvidenceDocId) || docs[1] || docs[0] || null;
      store.activeEvidenceDocId = activeDoc?.id || null;
      container.innerHTML = `
        <div class="evidence-summary-strip">
          <div><span>Invoice</span><strong>${escapeHtml(request.ref)}</strong></div>
          <div><span>Package</span><strong>${escapeHtml(pkg.name)}</strong></div>
          <div><span>Contractor</span><strong>${escapeHtml(pkg.contractor || request.submittedBy)}</strong></div>
          <div><span>Amount</span><strong>${formatGBP(request.amount)}</strong></div>
          <div><span>Status</span>${statusChip('Awaiting PM Review')}</div>
        </div>
        <div class="evidence-review-grid">
          <section class="evidence-pack-panel">
            <div class="evidence-panel-head">
              <div>
                <h3>Evidence Pack</h3>
                <p>${docs.length} linked document${docs.length === 1 ? '' : 's'} for this request</p>
              </div>
            </div>
            <div class="evidence-list">
              ${docs.map((doc) => {
                const isOpen = doc.id === store.activeEvidenceDocId;
                return `
                  <article class="evidence-item ${isOpen ? 'is-open' : ''}">
                    <button class="evidence-item-toggle" data-evidence-doc="${doc.id}" type="button">
                      <span class="evidence-chevron">${isOpen ? '⌄' : '›'}</span>
                      <span>
                        <strong>${escapeHtml(doc.name)}</strong>
                        <small>${escapeHtml(doc.type)} · ${escapeHtml(doc.ref)} · V${doc.version} · ${escapeHtml(doc.uploadedBy)} · ${formatDate(doc.date)}</small>
                      </span>
                      ${statusChip(evidenceDocStatus(doc))}
                    </button>
                    ${isOpen ? `
                      <div class="evidence-expanded">
                        <div class="evidence-preview-card">
                          <span class="wp-doc-icon">${escapeHtml((doc.type || 'Doc').slice(0, 3).toUpperCase())}</span>
                          <strong>Preview unavailable in MVP</strong>
                          <p>Use the stored reference while backend file preview is connected.</p>
                          <a class="btn btn-ghost small" href="#" target="_blank" rel="noreferrer">Open reference</a>
                        </div>
                        <div class="evidence-meta-card">
                          <div class="info-row"><span>Reference</span><strong>${escapeHtml(doc.ref)}</strong></div>
                          <div class="info-row"><span>Version</span><strong>V${doc.version}</strong></div>
                          <div class="info-row"><span>Linked payment</span><strong>${escapeHtml(request.ref)}</strong></div>
                          <div class="info-row"><span>Linked package</span><strong>${escapeHtml(pkg.name)}</strong></div>
                          <div class="info-row"><span>Chain record</span><strong>demoTx_${escapeHtml(doc.id)}</strong></div>
                        </div>
                        <div class="evidence-comments">
                          <h4>Reviewer comments</h4>
                          <p><strong>${escapeHtml(doc.uploadedBy)}:</strong> ${/cube|test/i.test(doc.name) ? 'Cube samples taken after Bay A pour, lab report attached.' : 'Evidence uploaded for this payment request.'}</p>
                          <label class="form-field"><span>PM draft comment</span><input type="text" placeholder="Add PM review comment..."></label>
                        </div>
                      </div>
                    ` : ''}
                  </article>
                `;
              }).join('') || '<div class="records-empty is-visible"><h3 class="records-empty__title">No evidence linked</h3><p class="records-empty__body">Ask the contractor to attach supporting documents before approval.</p></div>'}
            </div>
          </section>
          <aside class="approval-checklist-panel">
            <h3>Approval Checklist</h3>
            <label><input type="checkbox" checked> Work matches package scope</label>
            <label><input type="checkbox" checked> Evidence pack reviewed</label>
            <label><input type="checkbox" checked> Amount matches milestone schedule</label>
            <label><input type="checkbox" checked> No active hold</label>
            <label><input type="checkbox"> Site inspection complete</label>
            <div class="form-field">
              <label>Review Note</label>
              <textarea data-approve-review-note rows="4" placeholder="Add approval note for audit trail"></textarea>
            </div>
            <div class="evidence-audit-note">Approval will be recorded against the payment request account and visible in the audit trail.</div>
          </aside>
        </div>
      `;
    }

    function renderWorkPackageView() {
      const backBtn = document.getElementById('work-package-back-btn');
      const titleElement = document.getElementById('work-package-view-title');

      // Load package info from sessionStorage
      const packageData = sessionStorage.getItem('currentWorkPackage');
      let pkg = null;
      let project = activeProject();
      let storePackage = activePackage(project);
      if (packageData && titleElement) {
        pkg = JSON.parse(packageData);
        if (pkg.projectId && pkg.packageId) {
          project = projectFor(pkg.projectId);
          storePackage = packageFor(project, pkg.packageId);
        }
        titleElement.textContent = pkg.name;

        // Update all fields
        const projectName = document.getElementById('wp-project-name');
        const amount = document.getElementById('wp-amount');
        const status = document.getElementById('wp-status');
        const paymentDate = document.getElementById('wp-payment-date');
        const contractor = document.getElementById('wp-contractor');
        const type = document.getElementById('wp-type');

        if (projectName) projectName.textContent = project?.name || pkg.project || 'Civic Library Retrofit';
        if (amount) amount.textContent = pkg.amount || '£120,000';
        if (status) status.textContent = storePackage?.status || pkg.status || 'Completed';
        if (paymentDate) paymentDate.textContent = pkg.paymentDate || 'Mar 15, 2026';
        if (contractor) contractor.textContent = storePackage?.contractor || pkg.contractor || 'BuildTech Solutions Ltd';
        if (type) type.textContent = storePackage ? modelLabel(storePackage.contractModel || 'milestone') : pkg.type || 'Spent';
      }

      renderMilestonePaymentSchedule(pkg || {
        name: 'Work Package',
        amount: 'Â£120,000',
        type: 'Pending',
        paymentDate: 'Apr 20, 2026',
      });

      if (storePackage) {
        renderMilestonePaymentSchedule({
          name: storePackage.name,
          amount: storePackage.cap,
          type: storePackage.status,
          paymentDate: storePackage.completionDate,
          milestones: storePackage.milestones,
        });
      }
      if (project && storePackage) {
        renderWorkPackageHeader(project, storePackage);
        renderWorkPackageCurrentAction(project, storePackage);
        renderWorkPackageTasks(project, storePackage);
        renderWorkPackageRequest(project, storePackage);
        renderPackageSnapshot(project, storePackage);
        renderPaymentReadiness(project, storePackage);
        renderWorkPackageRecords(project, storePackage);
        document.querySelectorAll('[data-wp-tab]').forEach((tab) => {
          tab.onclick = () => {
            store.activeWorkPackageTab = tab.dataset.wpTab;
            renderWorkPackageRecords(project, storePackage);
          };
        });
      }
      renderWorkPackageActions(project, storePackage);
      renderWorkPackageViewDocuments(project, storePackage);
      renderWorkPackageViewTimeline(project, storePackage);
      renderChainFeedback();

      // Back button
      if (backBtn) {
        backBtn.onclick = () => {
          // Go back to where we came from (dashboard2 or chart-fullscreen)
          const previousPage = sessionStorage.getItem('workPackagePreviousPage') || 'dashboard2';
          window.location.hash = previousPage;
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
                  <div class="info-row"><span>Milestone reference</span><span>${doc.milestoneRef || 'Package level / none'}</span></div>
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
      const project = projectFor(id) || store.projects.find((item) => item.name === id);
      if (!project) return;
      renderProjectDetail(project.id);
      renderTimeline(project.id);
      window.location.hash = 'project-detail';
    }

    function openPackageModal(projectId, packageId, modalName, requestId = '', variationId = '') {
      store.activeProjectId = projectId;
      store.currentProjectId = projectId;
      store.activePackageId = packageId;
      store.currentPackageId = packageId;
      store.activeRequestId = requestId || null;
      store.activeVariationId = variationId || null;
      if (modalName === 'add-document') {
        prepareAddDocumentModal({ dataset: { modalTarget: 'add-document', documentScope: 'package' } });
      }
      openModal(modalName);
    }

    function openWorkPackageView(projectId, packageId, event) {
      if (event) {
        event.preventDefault?.();
        event.stopPropagation?.();
      }
      const project = projectFor(projectId);
      const pkg = packageFor(project, packageId);
      if (!project || !pkg) return;
      store.activeProjectId = project.id;
      store.currentProjectId = project.id;
      store.activePackageId = pkg.id;
      store.currentPackageId = pkg.id;
      store.activeRequestId = pkg.requests[pkg.requests.length - 1]?.id || null;
      store.activeVariationId = pkg.variationRequests?.[pkg.variationRequests.length - 1]?.id || null;
      store.activeWorkPackageTab = 'audit';
      const packageData = {
        project: project.name,
        projectId: project.id,
        packageId: pkg.id,
        name: pkg.name,
        amount: formatGBP(pkg.cap),
        type: pkg.status,
        status: pkg.status,
        paymentDate: pkg.completionDate || project.endDate || 'TBC',
        contractor: pkg.contractor,
        milestones: pkg.milestones,
      };
      sessionStorage.setItem('currentWorkPackage', JSON.stringify(packageData));
      sessionStorage.setItem('workPackagePreviousPage', currentRoute() || 'dashboard2');
      if (currentRoute() === 'work-package-view') {
        renderWorkPackageView();
      } else {
        window.location.hash = 'work-package-view';
      }
    }

    function showWorkPackage(projectName, packageName, amount, type, event) {
      if (event) event.stopPropagation(); // Prevent triggering project name click

      // Store package data for the view page
      const packageData = {
        project: projectName,
        name: packageName,
        amount: amount,
        type: type,
        status: type === 'Completed' ? 'Completed' : type === 'In Progress' ? 'In Progress' : 'Estimated',
        paymentDate: type === 'Completed' ? 'Mar 15, 2026' : type === 'In Progress' ? 'Apr 20, 2026' : 'May 10, 2026',
        contractor: type === 'Estimated' ? 'Not assigned yet' : contractorForProject(projectName),
      };
      packageData.milestones = buildPackageMilestones(packageData);
      sessionStorage.setItem('currentWorkPackage', JSON.stringify(packageData));

      // Store current page for back navigation
      const currentPage = window.location.hash.replace('#', '') || 'dashboard2';
      sessionStorage.setItem('workPackagePreviousPage', currentPage);

      // Navigate to work package view
      window.location.hash = 'work-package-view';
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

    function activeVariation(pkg = activePackage()) {
      return pkg?.variationRequests?.find((variation) => variation.id === store.activeVariationId) || pkg?.variationRequests?.[pkg.variationRequests.length - 1] || null;
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

    function selectedProjectContractModel() {
      return document.querySelector('[data-project-contract-model-card].is-selected')?.dataset.projectContractModel || 'milestone';
    }

    function modalScopedValue(modal, selector) {
      return modal.querySelector(selector)?.value.trim() || '';
    }

    function syncProjectClientMode() {
      const endClient = document.querySelector('[data-project-end-client]')?.checked ?? true;
      const clientField = document.querySelector('[data-project-client-field]');
      if (clientField) clientField.hidden = endClient;
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
        variationId: activeVariation(pkg)?.id,
      };
    }

    function syncContextFromTrigger(trigger) {
      if (!trigger?.dataset) return;
      if (trigger.dataset.projectId) {
        store.activeProjectId = trigger.dataset.projectId;
        store.currentProjectId = trigger.dataset.projectId;
      }
      if (trigger.dataset.packageId) {
        store.activePackageId = trigger.dataset.packageId;
        store.currentPackageId = trigger.dataset.packageId;
      }
      if (trigger.dataset.requestId) {
        store.activeRequestId = trigger.dataset.requestId;
      }
      if (trigger.dataset.variationId) {
        store.activeVariationId = trigger.dataset.variationId;
      }
    }

    function syncMilestoneStatuses(project) {
      if (!project?.milestones?.length) return;
      project.milestones.forEach((milestone) => {
        const packages = milestone.packageIds.map((id) => packageFor(project, id)).filter(Boolean);
        if (packages.some((pkg) => pkg.status === 'Locked')) {
          milestone.status = 'blocked';
        } else if (packages.length && packages.every((pkg) => isPackageComplete(pkg) || pkg.requests.some((request) => request.status === 'Released'))) {
          milestone.status = 'complete';
        } else if (packages.some((pkg) => pkg.requests.length > 0 || pkg.status === 'In Progress')) {
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
        client: formData.endClient ? 'End client' : formData.client,
        contractRef: formData.contractRef,
        budget: parsePackageAmount(formData.budget || 0),
        contractModel: formData.contractModel,
        endClient: Boolean(formData.endClient),
        startDate: formData.startDate,
        endDate: formData.endDate,
        status: 'Active',
        team: [
          { name: formData.pm, role: 'project_manager', org: '' },
          { name: formData.fd, role: 'finance_director', org: '' },
        ],
        packages: [],
        documents: [],
        milestones: (milestones || []).map((milestone, index) => ({
          id: milestone.id || `ms-${Date.now()}-${index + 1}`,
          name: milestone.name || `Payment section ${index + 1}`,
          targetDate: milestone.targetDate || formData.endDate,
          budget: milestone.budget || 0,
          releaseTrigger: milestone.releaseTrigger || '',
          status: milestone.status || 'upcoming',
          packageIds: milestone.packageIds || [],
        })),
        auditLog: [],
      };
      store.projects.push(project);
      logAudit(project, 'Project created', 'info');
      logAudit(project, 'Project Manager invited as owner: ' + formData.pm, 'info');
      renderProjectsList();
      showProjectDetail(project.id);
    }

    function addPackage(projectId, formData, milestones = []) {
      const project = projectFor(projectId);
      if (!project) return;
      const contractor = formData.contractor === 'Unassigned estimate' ? 'Unassigned estimate' : formData.contractor;
      const pkg = {
        id: 'wp-' + Date.now(),
        name: formData.name,
        cap: parsePackageAmount(formData.cap) || 0,
        contractModel: formData.contractModel || 'milestone',
        funded: 0,
        released: 0,
        status: 'Estimated',
        financeApprovalStatus: contractor === 'Unassigned estimate' ? 'Estimate' : 'Awaiting Finance Approval',
        contractor,
        contractRef: formData.contractRef || '',
        startDate: formData.startDate || '',
        completionDate: formData.completionDate || '',
        requests: [],
        variationRequests: [],
        documentRequests: [],
        milestones: milestones.map((milestone) => ({
          name: milestone.name,
          paymentDate: milestone.paymentDate,
          amount: milestone.amount,
          status: milestone.status || 'uninvoiced',
        })),
      };
      project.packages.push(pkg);
      syncMilestoneStatuses(project);
      store.activePackageId = pkg.id;
      logAudit(project, 'Estimated package added by Project Manager: ' + pkg.name, 'info');
      renderProjectDetail(projectId);
      renderDashboard2();
    }

    function approveWorkPackage(projectId, packageId) {
      const project = projectFor(projectId);
      const pkg = packageFor(project, packageId);
      if (!project || !pkg) return;
      pkg.financeApprovalStatus = 'Approved';
      pkg.status = 'In Progress';
      pkg.funded = Math.max(pkg.funded || 0, pkg.cap || 0);
      pkg.approvedBy = store.currentUser.name;
      pkg.approvedDate = new Date().toISOString().split('T')[0];
      syncMilestoneStatuses(project);
      logAudit(project, 'Finance approved work package and locked escrow: ' + pkg.name, 'released');
      logChainAction('Escrow PDA created', project, pkg, 'Package escrow account derived for the approved contractor and work package.', `escrow_${pkg.id}`);
      logChainAction('Mock USDC funded', project, pkg, `${formatGBP(pkg.funded)} mock USDC locked against the approved package cap.`, `vault_${pkg.id}`);
      renderProjectDetail(projectId);
      renderDashboard();
      renderDashboard2();
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
      logChainAction('Mock USDC funded', project, pkg, `${formatGBP(value)} mock USDC added to the package escrow vault.`, `vault_${pkg.id}`);
      renderProjectDetail(projectId);
      if (currentRoute() === 'work-package-view') renderWorkPackageView();
      renderDashboard();
      renderDashboard2();
    }

    function placeHold(projectId, packageId, reason) {
      const project = projectFor(projectId);
      const pkg = packageFor(project, packageId);
      if (!project || !pkg) return;
      pkg.status = 'Locked';
      syncMilestoneStatuses(project);
      logAudit(project, 'Hold placed on ' + pkg.name + ': ' + reason, 'rejected');
      renderProjectDetail(projectId);
      if (currentRoute() === 'work-package-view') renderWorkPackageView();
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
        releaseBasis: formData.releaseBasis || 'Package-level release',
        description: formData.description || '',
        documentRef: formData.documentRef || '',
      };
      pkg.requests.push(request);
      store.activeRequestId = request.id;
      syncMilestoneStatuses(project);
      logAudit(project, 'Invoice submitted: ' + request.ref + ' for ' + formatGBP(request.amount), 'pending');
      logChainAction('Payment request account created', project, pkg, `${request.ref} opened for ${formatGBP(request.amount)} against package escrow.`, `request_${request.id}`);
      renderPayments(projectId);
      if (currentRoute() === 'work-package-view') renderWorkPackageView();
      renderDashboard();
      renderDashboard2();
    }

    function submitVariation(projectId, packageId, formData) {
      const project = projectFor(projectId);
      const pkg = packageFor(project, packageId);
      if (!project || !pkg) return;
      if (!pkg.variationRequests) pkg.variationRequests = [];
      const submittedByPm = store.currentRole === 'project_manager';
      const variation = {
        id: 'var-' + Date.now(),
        ref: formData.ref,
        type: formData.type,
        amountChange: parseFloat(formData.amountChange) || 0,
        timeChange: parseInt(formData.timeChange, 10) || 0,
        reason: formData.reason || '',
        documentRef: formData.documentRef || '',
        submittedBy: store.currentUser.name,
        date: new Date().toISOString().split('T')[0],
        status: submittedByPm ? 'Pending Finance Approval' : 'Submitted',
        pmApproved: submittedByPm,
        pmApprovedBy: submittedByPm ? store.currentUser.name : null,
        pmApprovedDate: submittedByPm ? new Date().toISOString().split('T')[0] : null,
      };
      pkg.variationRequests.push(variation);
      logAudit(project, 'Variation request submitted for ' + pkg.name + ': ' + variation.ref, 'pending');
      renderProjectDetail(projectId);
      if (currentRoute() === 'work-package-view') renderWorkPackageView();
      renderDashboard();
      renderDashboard2();
    }

    function requestDocuments(projectId, packageId, formData) {
      const project = projectFor(projectId);
      const pkg = packageFor(project, packageId);
      if (!project || !pkg) return;
      if (!pkg.documentRequests) pkg.documentRequests = [];
      const request = {
        id: 'docreq-' + Date.now(),
        type: formData.type,
        dueDate: formData.dueDate || '',
        note: formData.note || '',
        requestedBy: store.currentUser.name,
        date: new Date().toISOString().split('T')[0],
        status: 'Requested',
      };
      pkg.documentRequests.push(request);
      logAudit(project, 'Document requested from contractor for ' + pkg.name + ': ' + request.type, 'pending');
      renderWorkPackageView();
      renderDashboard2();
    }

    function approveVariation(projectId, packageId, variationId, note) {
      const project = projectFor(projectId);
      const pkg = packageFor(project, packageId);
      const variation = pkg?.variationRequests?.find((item) => item.id === variationId);
      if (!project || !pkg || !variation) return;
      if (store.currentRole === 'project_manager') {
        variation.pmApproved = true;
        variation.pmApprovedBy = store.currentUser.name;
        variation.pmApprovedDate = new Date().toISOString().split('T')[0];
        variation.pmNote = note || '';
        variation.status = 'Pending Finance Approval';
        logAudit(project, 'Variation approved by PM for finance review: ' + variation.ref, 'pending');
      } else if (store.currentRole === 'finance_director') {
        variation.financeApproved = true;
        variation.financeApprovedBy = store.currentUser.name;
        variation.financeApprovedDate = new Date().toISOString().split('T')[0];
        variation.financeNote = note || '';
        variation.status = 'Pending Contractor Agreement';
        logAudit(project, 'Variation approved by Finance, awaiting contractor agreement: ' + variation.ref, 'released');
      } else if (store.currentRole === 'contractor') {
        variation.contractorAgreed = true;
        variation.contractorAgreedBy = store.currentUser.name;
        variation.contractorAgreedDate = new Date().toISOString().split('T')[0];
        variation.contractorNote = note || '';
        variation.status = 'Agreed';
        logAudit(project, 'Variation agreed by contractor: ' + variation.ref, 'released');
      }
      renderWorkPackageView();
      renderDashboard();
      renderDashboard2();
    }

    function rejectVariation(projectId, packageId, variationId, reason) {
      const project = projectFor(projectId);
      const pkg = packageFor(project, packageId);
      const variation = pkg?.variationRequests?.find((item) => item.id === variationId);
      if (!project || !pkg || !variation) return;
      variation.status = 'Rejected';
      variation.rejectedBy = store.currentUser.name;
      variation.rejectionReason = reason || 'No reason provided';
      variation.rejectedDate = new Date().toISOString().split('T')[0];
      logAudit(project, 'Variation rejected: ' + variation.ref + ' — ' + variation.rejectionReason, 'rejected');
      renderWorkPackageView();
      renderDashboard();
      renderDashboard2();
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
      logChainAction('Approval recorded', project, pkg, `Project Manager approval recorded for ${req.ref}.`, `approval_${req.id}_pm`);
      renderPayments(projectId);
      if (currentRoute() === 'work-package-view') renderWorkPackageView();
      renderDashboard();
      renderDashboard2();
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
      renderPayments(projectId);
      if (currentRoute() === 'work-package-view') renderWorkPackageView();
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
      logChainAction('Funds released', project, pkg, `${formatGBP(req.amount)} mock USDC released from escrow to the contractor wallet.`, `release_${req.id}`);
      renderProjectDetail(projectId);
      renderPayments(projectId);
      if (currentRoute() === 'work-package-view') renderWorkPackageView();
      renderDashboard();
      renderDashboard2();
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
        milestoneRef: formData.milestoneRef || null,
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
      const pkg = packageId ? packageFor(project, packageId) : null;
      const openDocRequest = pkg?.documentRequests?.find((request) => request.status === 'Requested' && request.type === formData.type);
      if (openDocRequest) {
        openDocRequest.status = 'Fulfilled';
        openDocRequest.fulfilledBy = store.currentUser.name;
        openDocRequest.fulfilledDate = doc.date;
      }
      if (project) logAudit(project, 'Document added: ' + doc.name, 'info');
      renderDocuments(projectId);
      renderPayments(projectId);
      if (currentRoute() === 'work-package-view') renderWorkPackageView();
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
      if (currentRoute() === 'work-package-view') renderWorkPackageView();
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
      if (currentRoute() === 'work-package-view') renderWorkPackageView();
    }

    function setAppRole(roleKey) {
      const nextIndex = roles.findIndex((role) => roleKeyFromLabel(role.label) === roleKey);
      if (nextIndex < 0 || nextIndex === roleIndex) return;
      roleIndex = nextIndex;
      renderRole();
      maybeAnimateDashboardKpis();
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
        budget: parsePackageAmount(row.querySelector('[data-milestone-budget]')?.value || 0),
        releaseTrigger: row.querySelector('[data-milestone-trigger]')?.value.trim() || '',
        status: 'upcoming',
        packageIds: [],
      }));
    }

    function renderMilestoneBuilderLegacy(rows = [
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
      return getMilestoneRowValues().filter((milestone) => milestone.name || milestone.targetDate || milestone.budget || milestone.releaseTrigger);
    }

    function sectionDefaultsForModel(model = selectedProjectContractModel()) {
      if (model === 'valuation') {
        return {
          title: 'Define valuation periods',
          help: 'Set each valuation period, assessment date, and budget allowance.',
          nameLabel: 'Valuation period',
          namePlaceholder: 'Month 1 valuation',
          triggerPlaceholder: 'Assessment and payment notice complete',
          rows: [
            { name: 'Month 1 valuation', targetDate: '', budget: 0, releaseTrigger: 'Assessment approved' },
            { name: 'Month 2 valuation', targetDate: '', budget: 0, releaseTrigger: 'Assessment approved' },
          ],
        };
      }
      if (model === 'bespoke') {
        return {
          title: 'Define bespoke release stages',
          help: 'Set each custom payment stage, release trigger, and budget allowance.',
          nameLabel: 'Release stage',
          namePlaceholder: 'Design package approval',
          triggerPlaceholder: 'Named approval or document condition',
          rows: [
            { name: 'Initial release stage', targetDate: '', budget: 0, releaseTrigger: 'Named approval complete' },
            { name: 'Final release stage', targetDate: '', budget: 0, releaseTrigger: 'Completion evidence accepted' },
          ],
        };
      }
      return {
        title: 'Define project milestones',
        help: 'Set the milestone names, target dates, and budget allowance for each stage.',
        nameLabel: 'Milestone',
        namePlaceholder: 'Foundation & Groundworks',
        triggerPlaceholder: 'Completion certificate and PM approval',
        rows: [
          { name: 'Foundation & Groundworks', targetDate: '', budget: 0, releaseTrigger: 'Stage complete and approved' },
          { name: 'Structural Frame', targetDate: '', budget: 0, releaseTrigger: 'Stage complete and approved' },
        ],
      };
    }

    function syncNewProjectBudgetSummary() {
      const summary = document.querySelector('[data-new-project-budget-summary]');
      if (!summary) return;
      const overallBudget = parsePackageAmount(document.querySelector('[data-new-project-budget]')?.value || 0);
      const sectionTotal = getMilestoneRowValues().reduce((sum, row) => sum + (row.budget || 0), 0);
      const remaining = overallBudget - sectionTotal;
      summary.textContent = `Overall budget: ${formatGBP(overallBudget)} | Sections: ${formatGBP(sectionTotal)} | Remaining: ${formatGBP(remaining)}`;
      summary.classList.toggle('is-over', overallBudget > 0 && remaining < 0);
    }

    function renderMilestoneBuilder(rows) {
      const builder = document.querySelector('[data-milestone-builder]');
      if (!builder) return;
      const config = sectionDefaultsForModel();
      const title = document.querySelector('[data-payment-section-title]');
      const help = document.querySelector('[data-payment-section-help]');
      if (title) title.textContent = config.title;
      if (help) help.textContent = config.help;
      const nextRows = rows?.length ? rows : config.rows;
      builder.innerHTML = nextRows.map((row) => `
        <div class="new-project-section-row" data-milestone-row>
          <div class="form-field">
            <label>${config.nameLabel} name</label>
            <input type="text" value="${escapeHtml(row.name || '')}" placeholder="${escapeHtml(config.namePlaceholder)}" data-milestone-name>
          </div>
          <div class="form-field">
            <label>Target date</label>
            <input type="date" value="${escapeHtml(row.targetDate || '')}" data-milestone-date>
          </div>
          <div class="form-field">
            <label>Budget - GBP</label>
            <input type="number" min="0" step="1000" value="${row.budget || ''}" placeholder="0" data-milestone-budget>
          </div>
          <div class="form-field">
            <label>Release condition</label>
            <input type="text" value="${escapeHtml(row.releaseTrigger || '')}" placeholder="${escapeHtml(config.triggerPlaceholder)}" data-milestone-trigger>
          </div>
          <button class="new-project-remove-section" type="button" data-remove-milestone-row aria-label="Remove section" ${nextRows.length === 1 ? 'disabled' : ''}>Remove</button>
        </div>
      `).join('');
      syncNewProjectBudgetSummary();
      validateMilestoneProjectForm();
    }

    function selectedPackageContractModel() {
      return document.querySelector('[data-package-contract-model]')?.value || 'milestone';
    }

    function packageScheduleRows() {
      return [...document.querySelectorAll('[data-package-milestone-row]')];
    }

    function packageBudgetValue() {
      return parsePackageAmount(document.querySelector('[data-add-package-budget]')?.value || 0);
    }

    function packageScheduleRequired() {
      const model = selectedPackageContractModel();
      return model === 'milestone' || model === 'bespoke';
    }

    function packageScheduleConfig(model = selectedPackageContractModel()) {
      if (model === 'bespoke') {
        return {
          title: 'Define bespoke payment stages',
          help: 'Adjust each custom stage name, payment date, and amount before the package is created.',
          addLabel: 'Add stage',
          nameLabel: 'Stage name',
          namePlaceholder: 'Custom release stage',
          names: ['Initial release', 'Main works release', 'Completion release'],
          shares: [0.25, 0.5, 0.25],
        };
      }
      return {
        title: 'Define package milestones',
        help: 'Adjust each milestone name, payment date, and amount before the package is created.',
        addLabel: 'Add milestone',
        nameLabel: 'Milestone name',
        namePlaceholder: 'Foundation pour',
        names: ['Mobilisation', 'Works complete', 'Inspection sign-off', 'Retention release'],
        shares: [0.2, 0.35, 0.35, 0.1],
      };
    }

    function addDaysToIso(dateValue, days) {
      const base = dateValue ? new Date(`${dateValue}T00:00:00`) : new Date();
      if (Number.isNaN(base.getTime())) return '';
      base.setDate(base.getDate() + days);
      return base.toISOString().split('T')[0];
    }

    function packageScheduleDefaultRows() {
      const config = packageScheduleConfig();
      const budget = packageBudgetValue();
      const packageName = document.querySelector('[data-add-package-name]')?.value.trim() || 'Package';
      const start = document.querySelector('[data-add-package-start]')?.value || new Date().toISOString().split('T')[0];
      const end = document.querySelector('[data-add-package-completion]')?.value || '';
      return config.names.map((name, index) => {
        const amount = Math.round((budget * config.shares[index]) / 1000) * 1000;
        const date = end && index === config.names.length - 1
          ? end
          : addDaysToIso(start, (index + 1) * 14);
        return {
          name: `${packageName} ${name}`.trim(),
          paymentDate: date,
          amount,
          status: 'uninvoiced',
        };
      });
    }

    function getPackageMilestoneRowValues() {
      return packageScheduleRows().map((row) => ({
        name: row.querySelector('[data-package-milestone-name]')?.value.trim() || '',
        paymentDate: row.querySelector('[data-package-milestone-date]')?.value || '',
        amount: parsePackageAmount(row.querySelector('[data-package-milestone-amount]')?.value || 0),
        status: row.querySelector('[data-package-milestone-status]')?.value || 'uninvoiced',
      }));
    }

    function syncPackageScheduleSummary() {
      const summary = document.querySelector('[data-package-schedule-summary]');
      if (!summary) return;
      const budget = packageBudgetValue();
      const rows = getPackageMilestoneRowValues();
      const total = rows.reduce((sum, row) => sum + (row.amount || 0), 0);
      const remaining = budget - total;
      const dates = rows.map((row) => row.paymentDate).filter(Boolean);
      const hasDuplicateDates = new Set(dates).size !== dates.length;
      summary.textContent = hasDuplicateDates
        ? `Package budget: ${formatGBP(budget)} | Milestones: ${formatGBP(total)} | Dates cannot overlap`
        : `Package budget: ${formatGBP(budget)} | Milestones: ${formatGBP(total)} | Remaining: ${formatGBP(remaining)}`;
      summary.classList.toggle('is-over', budget > 0 && remaining < 0 && !hasDuplicateDates);
      summary.classList.toggle('is-error', hasDuplicateDates);
    }

    function validatePackageSchedule() {
      const createButton = document.querySelector('[data-add-package-create]');
      if (!createButton) return;
      if (!packageScheduleRequired()) {
        createButton.disabled = false;
        return;
      }
      const rows = getPackageMilestoneRowValues();
      const dates = rows.map((row) => row.paymentDate).filter(Boolean);
      const hasDuplicateDates = new Set(dates).size !== dates.length;
      createButton.disabled = rows.length < 1
        || rows.some((row) => !row.name || !row.paymentDate || row.amount <= 0)
        || hasDuplicateDates;
      syncPackageScheduleSummary();
    }

    function renderPackageMilestoneBuilder(rows = packageScheduleDefaultRows()) {
      const builder = document.querySelector('[data-package-milestone-builder]');
      if (!builder) return;
      const config = packageScheduleConfig();
      const title = document.querySelector('[data-package-schedule-title]');
      const help = document.querySelector('[data-package-schedule-help]');
      const addButton = document.querySelector('[data-add-package-milestone-row]');
      if (title) title.textContent = config.title;
      if (help) help.textContent = config.help;
      if (addButton) addButton.textContent = config.addLabel;
      builder.innerHTML = rows.map((row) => `
        <div class="new-project-section-row" data-package-milestone-row>
          <div class="form-field">
            <label>${config.nameLabel}</label>
            <input type="text" value="${escapeHtml(row.name || '')}" placeholder="${escapeHtml(config.namePlaceholder)}" data-package-milestone-name>
          </div>
          <div class="form-field">
            <label>Payment date</label>
            <input type="date" value="${escapeHtml(row.paymentDate || '')}" data-package-milestone-date>
          </div>
          <div class="form-field">
            <label>Amount - GBP</label>
            <input type="number" min="0" step="1000" value="${row.amount || ''}" placeholder="0" data-package-milestone-amount>
          </div>
          <div class="form-field">
            <label>Status</label>
            <select data-package-milestone-status>
              <option value="uninvoiced" ${row.status === 'uninvoiced' ? 'selected' : ''}>Uninvoiced</option>
              <option value="invoiced" ${row.status === 'invoiced' ? 'selected' : ''}>Invoiced</option>
              <option value="paid" ${row.status === 'paid' ? 'selected' : ''}>Released</option>
              <option value="contested" ${row.status === 'contested' ? 'selected' : ''}>Contested</option>
            </select>
          </div>
          <button class="new-project-remove-section" type="button" data-remove-package-milestone-row aria-label="Remove schedule row" ${rows.length === 1 ? 'disabled' : ''}>Remove</button>
        </div>
      `).join('');
      syncPackageScheduleSummary();
      validatePackageSchedule();
    }

    function collectPackageMilestones() {
      return packageScheduleRequired()
        ? getPackageMilestoneRowValues().filter((row) => row.name || row.paymentDate || row.amount)
        : [];
    }

    function renderAddPackageStep(step = 1) {
      const steps = document.querySelectorAll('[data-package-step]');
      const panels = document.querySelectorAll('[data-package-panel]');
      const backButton = document.querySelector('[data-package-back]');
      const nextButton = document.querySelector('[data-package-next]');
      const createButton = document.querySelector('[data-add-package-create]');
      const needsSchedule = packageScheduleRequired();
      steps.forEach((item) => {
        const itemStep = Number(item.dataset.packageStep);
        item.classList.toggle('is-active', itemStep === step);
        item.classList.toggle('is-complete', itemStep < step);
        item.hidden = itemStep === 2 && !needsSchedule;
      });
      panels.forEach((panel) => {
        panel.classList.toggle('is-active', Number(panel.dataset.packagePanel) === step);
      });
      if (backButton) backButton.hidden = step === 1;
      if (nextButton) nextButton.hidden = !needsSchedule || step !== 1;
      if (createButton) createButton.hidden = needsSchedule ? step !== 2 : false;
      if (step === 2) renderPackageMilestoneBuilder(getPackageMilestoneRowValues().length ? getPackageMilestoneRowValues() : packageScheduleDefaultRows());
      validatePackageSchedule();
    }

    function validateMilestoneProjectForm() {
      const createButton = document.querySelector('[data-new-project-create]');
      const builder = document.querySelector('[data-milestone-builder]');
      if (!createButton || !builder) {
        if (createButton) createButton.disabled = false;
        return;
      }
      const sections = collectMilestones();
      createButton.disabled = sections.length < 1 || sections.some((section) => !section.name);
      syncNewProjectBudgetSummary();
    }

    function renderNewProjectStep(step) {
      const steps = document.querySelectorAll('[data-new-project-step]');
      const panels = document.querySelectorAll('[data-new-project-panel]');
      const backButton = document.querySelector('[data-new-project-back]');
      const nextButton = document.querySelector('[data-new-project-next]');
      const createButton = document.querySelector('[data-new-project-create]');
      if (!steps.length || panels.length <= 1) {
        panels.forEach((panel) => panel.classList.add('is-active'));
        if (backButton) backButton.hidden = true;
        if (nextButton) nextButton.hidden = true;
        if (createButton) {
          createButton.hidden = false;
          createButton.disabled = false;
        }
        return;
      }
      steps.forEach((item) => {
        const itemStep = Number(item.dataset.newProjectStep);
        item.classList.toggle('is-active', itemStep === step);
        item.classList.toggle('is-complete', itemStep < step);
      });
      panels.forEach((panel) => {
        panel.classList.toggle('is-active', Number(panel.dataset.newProjectPanel) === step);
      });
      if (backButton) backButton.hidden = step === 1;
      if (nextButton) nextButton.hidden = step !== 1;
      if (createButton) createButton.hidden = step !== 2;
      if (step === 2) renderMilestoneBuilder(getMilestoneRowValues());
      validateMilestoneProjectForm();
    }

    document.querySelector('[data-new-project-next]')?.addEventListener('click', () => {
      renderNewProjectStep(2);
    });

    document.querySelector('[data-new-project-back]')?.addEventListener('click', () => {
      renderNewProjectStep(1);
    });

    document.querySelector('[data-add-milestone-row]')?.addEventListener('click', () => {
      const rows = getMilestoneRowValues();
      rows.push({ name: '', targetDate: '', budget: 0, releaseTrigger: '', status: 'upcoming', packageIds: [] });
      renderMilestoneBuilder(rows);
    });

    document.querySelector('[data-milestone-builder]')?.addEventListener('click', (event) => {
      const removeButton = event.target.closest('[data-remove-milestone-row]');
      if (!removeButton) return;
      const rows = getMilestoneRowValues();
      const index = milestoneRows().indexOf(removeButton.closest('[data-milestone-row]'));
      rows.splice(index, 1);
      renderMilestoneBuilder(rows.length ? rows : [{ name: '', targetDate: '', budget: 0, releaseTrigger: '', status: 'upcoming', packageIds: [] }]);
    });

    document.querySelector('[data-milestone-builder]')?.addEventListener('input', validateMilestoneProjectForm);
    document.querySelector('[data-new-project-budget]')?.addEventListener('input', syncNewProjectBudgetSummary);
    document.querySelector('[data-project-end-client]')?.addEventListener('change', syncProjectClientMode);
    document.querySelectorAll('[data-project-contract-model-card]').forEach((card) => {
      card.addEventListener('click', () => {
        document.querySelectorAll('[data-project-contract-model-card]').forEach((item) => {
          const isSelected = item === card;
          item.classList.toggle('is-selected', isSelected);
          item.setAttribute('aria-pressed', String(isSelected));
        });
        renderMilestoneBuilder(sectionDefaultsForModel(card.dataset.projectContractModel).rows);
      });
    });

    document.querySelector('[data-package-next]')?.addEventListener('click', () => {
      renderAddPackageStep(2);
    });

    document.querySelector('[data-package-back]')?.addEventListener('click', () => {
      renderAddPackageStep(1);
    });

    document.querySelector('[data-package-contract-model]')?.addEventListener('change', () => {
      renderPackageMilestoneBuilder(packageScheduleDefaultRows());
      renderAddPackageStep(1);
    });

    document.querySelector('[data-add-package-budget]')?.addEventListener('input', () => {
      renderPackageMilestoneBuilder(packageScheduleDefaultRows());
      renderAddPackageStep(1);
    });

    document.querySelector('[data-add-package-name]')?.addEventListener('input', () => {
      if (!document.querySelector('[data-package-panel="2"]')?.classList.contains('is-active')) {
        renderPackageMilestoneBuilder(packageScheduleDefaultRows());
      }
    });

    document.querySelector('[data-add-package-start]')?.addEventListener('change', () => renderPackageMilestoneBuilder(packageScheduleDefaultRows()));
    document.querySelector('[data-add-package-completion]')?.addEventListener('change', () => renderPackageMilestoneBuilder(packageScheduleDefaultRows()));

    document.querySelector('[data-add-package-milestone-row]')?.addEventListener('click', () => {
      const rows = getPackageMilestoneRowValues();
      rows.push({ name: '', paymentDate: '', amount: 0, status: 'uninvoiced' });
      renderPackageMilestoneBuilder(rows);
    });

    document.querySelector('[data-package-milestone-builder]')?.addEventListener('click', (event) => {
      const removeButton = event.target.closest('[data-remove-package-milestone-row]');
      if (!removeButton) return;
      const rows = getPackageMilestoneRowValues();
      const index = packageScheduleRows().indexOf(removeButton.closest('[data-package-milestone-row]'));
      rows.splice(index, 1);
      renderPackageMilestoneBuilder(rows.length ? rows : [{ name: '', paymentDate: '', amount: 0, status: 'uninvoiced' }]);
    });

    document.querySelector('[data-package-milestone-builder]')?.addEventListener('input', validatePackageSchedule);
    document.querySelector('[data-package-milestone-builder]')?.addEventListener('change', validatePackageSchedule);

    function handleModalSubmit(modal) {
      const modalName = modal.dataset.modal;
      const context = currentContextIds();
      if (modalName === 'new-project') {
        const endClient = modal.querySelector('[data-project-end-client]')?.checked ?? true;
        createProject({
          name: modalScopedValue(modal, '[data-new-project-name]') || 'Untitled Project',
          client: modalScopedValue(modal, '[data-new-project-client]') || 'Client Organisation',
          contractRef: modalScopedValue(modal, '[data-new-project-ref]') || 'REF-' + Date.now(),
          budget: modalScopedValue(modal, '[data-new-project-budget]') || '0',
          startDate: modalScopedValue(modal, '[data-new-project-start]') || new Date().toISOString().split('T')[0],
          endDate: modalScopedValue(modal, '[data-new-project-end]') || new Date().toISOString().split('T')[0],
          pm: modalScopedValue(modal, '[data-new-project-pm]') || 'Eleanor Lane',
          fd: modalScopedValue(modal, '[data-new-project-fd]') || 'Maya Shah',
          contractModel: selectedProjectContractModel(),
          endClient,
        }, collectMilestones());
      }

      if (modalName === 'add-package') {
        addPackage(context.projectId, {
          name: modalScopedValue(modal, '[data-add-package-name]') || 'New Work Package',
          contractModel: selectedPackageContractModel(),
          cap: modalScopedValue(modal, '[data-add-package-budget]') || '0',
          contractor: modalScopedValue(modal, '[data-add-package-contractor]') || 'Unassigned estimate',
          contractRef: modalScopedValue(modal, '[data-add-package-ref]') || '',
          startDate: modalScopedValue(modal, '[data-add-package-start]') || '',
          completionDate: modalScopedValue(modal, '[data-add-package-completion]') || '',
        }, collectPackageMilestones());
      }

      if (modalName === 'fund-package') {
        fundPackage(context.projectId, context.packageId, modalFieldValue(modal, 0) || '0');
      }

      if (modalName === 'place-hold') {
        placeHold(context.projectId, context.packageId, modalFieldValue(modal, 0) || 'No reason provided');
      }

      if (modalName === 'submit-invoice') {
        submitInvoice(context.projectId, context.packageId, {
          ref: modalScopedValue(modal, '[data-submit-invoice-ref]') || 'INV-' + Date.now(),
          amount: modalScopedValue(modal, '[data-submit-invoice-amount]') || '0',
          releaseBasis: modalScopedValue(modal, '[data-submit-invoice-basis]') || 'Package-level release',
          description: modalScopedValue(modal, '[data-submit-invoice-description]'),
          documentRef: modalScopedValue(modal, '[data-submit-invoice-document]'),
        });
      }

      if (modalName === 'submit-variation') {
        submitVariation(context.projectId, context.packageId, {
          ref: modalScopedValue(modal, '[data-variation-ref]') || 'VAR-' + Date.now(),
          type: modalScopedValue(modal, '[data-variation-type]') || 'Increase package value',
          amountChange: modalScopedValue(modal, '[data-variation-amount]') || '0',
          timeChange: modalScopedValue(modal, '[data-variation-days]') || '0',
          reason: modalScopedValue(modal, '[data-variation-reason]'),
          documentRef: modalScopedValue(modal, '[data-variation-document]'),
        });
      }

      if (modalName === 'request-documents') {
        requestDocuments(context.projectId, context.packageId, {
          type: modalScopedValue(modal, '[data-document-request-type]') || 'Progress Report',
          dueDate: modalScopedValue(modal, '[data-document-request-due]'),
          note: modalScopedValue(modal, '[data-document-request-note]'),
        });
      }

      if (modalName === 'approve-variation') {
        approveVariation(context.projectId, context.packageId, context.variationId, modalFieldValue(modal, 0));
      }

      if (modalName === 'reject-variation') {
        rejectVariation(context.projectId, context.packageId, context.variationId, modalFieldValue(modal, 0) || 'No reason provided');
      }

      if (modalName === 'approve-request') {
        approveRequest(context.projectId, context.packageId, context.requestId, modalScopedValue(modal, '[data-approve-review-note]') || modalFieldValue(modal, 0));
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
          milestoneRef: fieldValue('[data-add-document-milestone-ref]') || null,
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
      const paymentSelect = document.querySelector('[data-add-document-payment]');
      const isPackageContext = trigger.dataset.documentScope === 'package' || currentRoute() === 'work-package-view';
      if (paymentSelect) {
        paymentSelect.innerHTML = [
          '<option>Not linked</option>',
          ...(project ? getAllRequests(project).map((request) => `<option value="${request.ref}">${request.ref}</option>`) : []),
        ].join('');
      }

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
      if (name === 'approve-request') renderEvidenceReviewModal();
      if (name === 'new-project') {
        renderMilestoneBuilder();
        renderNewProjectStep(1);
      }
      if (name === 'new-project') syncProjectClientMode();
      if (name === 'add-package') {
        renderPackageMilestoneBuilder(packageScheduleDefaultRows());
        renderAddPackageStep(1);
      }
    }

    function setLandingRole(role) {
      const home = document.getElementById('home-page');
      if (!home) return;
      home.dataset.selectedRole = role;
      setAppRole(landingRoleToAppRole[role] || 'finance_director');
      document.querySelectorAll('[data-landing-role]').forEach((button) => {
        const isActive = button.dataset.landingRole === role;
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-selected', String(isActive));
      });
      document.querySelectorAll('[data-role-story]').forEach((panel) => {
        panel.classList.toggle('is-active', panel.dataset.roleStory === role);
      });
      document.querySelectorAll('[data-role-board]').forEach((panel) => {
        panel.classList.toggle('is-active', panel.dataset.roleBoard === role);
      });
    }

    function initLandingPage() {
      const home = document.getElementById('home-page');
      if (!home) return;

      document.querySelectorAll('[data-landing-role]').forEach((button) => {
        button.addEventListener('click', () => setLandingRole(button.dataset.landingRole));
      });
      document.querySelectorAll('[data-demo-role-link]').forEach((link) => {
        link.addEventListener('click', () => setLandingRole(link.dataset.demoRoleLink));
      });
      setLandingRole(home.dataset.selectedRole || 'finance');

      const reveals = Array.from(document.querySelectorAll('.landing-reveal'));
      if (!('IntersectionObserver' in window)) {
        reveals.forEach((section) => section.classList.add('is-visible'));
        return;
      }

      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      }, { threshold: 0.18 });

      reveals.forEach((section) => observer.observe(section));
    }

    document.querySelectorAll('[data-modal-target]').forEach((trigger) => {
      trigger.addEventListener('click', () => {
        syncContextFromTrigger(trigger);
        prepareAddDocumentModal(trigger);
        openModal(trigger.dataset.modalTarget);
      });
    });

    document.addEventListener('click', (event) => {
      const trigger = event.target.closest('[data-modal-target]');
      if (!trigger) return;
      syncContextFromTrigger(trigger);
      prepareAddDocumentModal(trigger);
      openModal(trigger.dataset.modalTarget);
    });

    document.addEventListener('click', (event) => {
      const modal = event.target.closest('[data-modal]');
      const button = event.target.closest('.modal-footer .btn');
      if (!modal || !button || button.matches('[data-modal-close], [data-modal-target], [data-new-project-next], [data-new-project-back], [data-package-next], [data-package-back]')) return;
      event.preventDefault();
      event.stopPropagation();
      handleModalSubmit(modal);
    });

    document.addEventListener('click', (event) => {
      const evidenceToggle = event.target.closest('[data-evidence-doc]');
      if (!evidenceToggle) return;
      store.activeEvidenceDocId = store.activeEvidenceDocId === evidenceToggle.dataset.evidenceDoc ? null : evidenceToggle.dataset.evidenceDoc;
      renderEvidenceReviewModal();
    });

    document.addEventListener('click', (event) => {
      const trigger = event.target.closest('[data-open-work-package]');
      if (!trigger) return;
      const nestedControl = event.target.closest('a, button, input, select, textarea, label');
      if (nestedControl && nestedControl !== trigger) return;
      openWorkPackageView(trigger.dataset.projectId, trigger.dataset.packageId, event);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const trigger = event.target.closest('tr[data-open-work-package]');
      if (!trigger) return;
      event.preventDefault();
      openWorkPackageView(trigger.dataset.projectId, trigger.dataset.packageId, event);
    });

    document.addEventListener('click', (event) => {
      if (!event.target.closest('[data-open-wp-documents]')) return;
      store.activeWorkPackageTab = 'documents';
      const project = activeProject();
      const pkg = activePackage(project);
      if (project && pkg) requestAnimationFrame(() => renderWorkPackageRecords(project, pkg));
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

    document.querySelectorAll('[data-theme-toggle]').forEach((toggle) => {
      toggle.addEventListener('click', () => {
        const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
        document.documentElement.dataset.theme = nextTheme;
        localStorage.setItem('construkt-theme', nextTheme);
      });
    });

    window.addEventListener('hashchange', renderRoute);

    applyInitialTheme();
    initChartTooltips();
    initLandingPage();
    renderRole();
    renderDashboard();
    renderProjectsList();
    renderRoute();
    if (document.querySelector('[data-doc-filter="type"]')) {
      applyDocumentFilters();
    }
    syncProjectDetailEmptyStates();
