use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("cTkcdfaMNy3LbZVtaX4j4RwFrE91j34gRZQ5CHTKCb4");

pub const MAX_NAME_LEN: usize = 64;
pub const MAX_REF_LEN: usize = 128;
pub const MAX_NOTE_REF_LEN: usize = 128;

#[program]
pub mod construkt {
    use super::*;

    pub fn initialize_project(
        ctx: Context<InitializeProject>,
        project_id: u64,
        name: String,
        metadata_ref: String,
        budget_amount: u64,
    ) -> Result<()> {
        require!(name.len() <= MAX_NAME_LEN, ConstruktError::StringTooLong);
        require!(
            metadata_ref.len() <= MAX_REF_LEN,
            ConstruktError::StringTooLong
        );
        require!(budget_amount > 0, ConstruktError::InvalidAmount);

        let clock = Clock::get()?;
        let project = &mut ctx.accounts.project;
        project.authority = ctx.accounts.authority.key();
        project.project_id = project_id;
        project.mint = ctx.accounts.mint.key();
        project.budget_amount = budget_amount;
        project.allocated_amount = 0;
        project.name = name;
        project.status = ProjectStatus::Active;
        project.created_at = clock.unix_timestamp;
        project.metadata_ref = metadata_ref;
        project.bump = ctx.bumps.project;

        emit!(ProjectInitialized {
            project: project.key(),
            authority: project.authority,
            project_id,
            mint: project.mint,
            budget_amount: project.budget_amount,
            allocated_amount: project.allocated_amount,
            created_at: project.created_at,
        });

        Ok(())
    }

    pub fn create_work_package(
        ctx: Context<CreateWorkPackage>,
        package_id: u64,
        cap_amount: u64,
        contractor: Pubkey,
        scope_ref: String,
    ) -> Result<()> {
        require_keys_eq!(
            ctx.accounts.authority.key(),
            ctx.accounts.project.authority,
            ConstruktError::Unauthorized
        );
        require!(cap_amount > 0, ConstruktError::InvalidAmount);
        require!(
            contractor != Pubkey::default(),
            ConstruktError::InvalidAccountRelationship
        );
        require!(
            scope_ref.len() <= MAX_REF_LEN,
            ConstruktError::StringTooLong
        );

        let next_allocated_amount = ctx.accounts.project.allocate_package_cap(cap_amount)?;

        let work_package = &mut ctx.accounts.work_package;
        work_package.project = ctx.accounts.project.key();
        work_package.package_id = package_id;
        work_package.cap_amount = cap_amount;
        work_package.funded_amount = 0;
        work_package.released_amount = 0;
        work_package.reserved_request_amount = 0;
        work_package.allocated_milestone_amount = 0;
        work_package.milestone_counter = 0;
        work_package.contractor = contractor;
        work_package.mint = ctx.accounts.mint.key();
        work_package.vault = ctx.accounts.vault.key();
        work_package.vault_authority_bump = ctx.bumps.vault_authority;
        work_package.status = WorkPackageStatus::Active;
        work_package.scope_ref = scope_ref;
        work_package.request_counter = 0;
        work_package.has_active_request = false;
        work_package.active_request = Pubkey::default();
        work_package.bump = ctx.bumps.work_package;

        let project = &mut ctx.accounts.project;
        project.allocated_amount = next_allocated_amount;

        emit!(WorkPackageCreated {
            project: work_package.project,
            work_package: work_package.key(),
            package_id,
            contractor,
            mint: work_package.mint,
            vault: work_package.vault,
            cap_amount,
            project_budget_amount: project.budget_amount,
            project_allocated_amount: project.allocated_amount,
        });

        Ok(())
    }

    pub fn create_milestone(
        ctx: Context<CreateMilestone>,
        milestone_id: u64,
        amount: u64,
        start_at: i64,
        end_at: i64,
        metadata_ref: String,
    ) -> Result<()> {
        require!(amount > 0, ConstruktError::InvalidAmount);
        require!(start_at < end_at, ConstruktError::InvalidStatus);
        require!(
            metadata_ref.len() <= MAX_REF_LEN,
            ConstruktError::StringTooLong
        );

        let work_package_key = ctx.accounts.work_package.key();
        let next_milestone_id = {
            let work_package = &ctx.accounts.work_package;
            require!(
                work_package.status == WorkPackageStatus::Active,
                ConstruktError::InvalidStatus
            );
            require!(
                work_package.request_counter == 0,
                ConstruktError::InvalidStatus
            );
            require!(
                work_package.funded_amount == 0,
                ConstruktError::InvalidStatus
            );
            let next_milestone_id = work_package.next_milestone_id()?;
            require!(
                milestone_id == next_milestone_id,
                ConstruktError::InvalidRequestId
            );
            next_milestone_id
        };
        let next_allocated_amount = ctx.accounts.work_package.allocate_milestone_amount(amount)?;

        let milestone = &mut ctx.accounts.milestone;
        milestone.work_package = work_package_key;
        milestone.milestone_id = next_milestone_id;
        milestone.amount = amount;
        milestone.released_amount = 0;
        milestone.start_at = start_at;
        milestone.end_at = end_at;
        milestone.status = MilestoneStatus::Active;
        milestone.metadata_ref = metadata_ref;
        milestone.has_active_request = false;
        milestone.active_request = Pubkey::default();
        milestone.bump = ctx.bumps.milestone;

        let work_package = &mut ctx.accounts.work_package;
        work_package.allocated_milestone_amount = next_allocated_amount;
        work_package.milestone_counter = next_milestone_id;

        emit!(MilestoneCreated {
            work_package: work_package_key,
            milestone: ctx.accounts.milestone.key(),
            milestone_id: next_milestone_id,
            amount,
            start_at,
            end_at,
            allocated_milestone_amount: next_allocated_amount,
        });

        Ok(())
    }

    pub fn fund_escrow(ctx: Context<FundEscrow>, amount: u64) -> Result<()> {
        require_keys_eq!(
            ctx.accounts.authority.key(),
            ctx.accounts.project.authority,
            ConstruktError::Unauthorized
        );
        require!(amount > 0, ConstruktError::InvalidAmount);
        require_keys_eq!(
            ctx.accounts.work_package.project,
            ctx.accounts.project.key(),
            ConstruktError::InvalidAccountRelationship
        );
        require_keys_eq!(
            ctx.accounts.finance_token_account.mint,
            ctx.accounts.work_package.mint,
            ConstruktError::WrongMint
        );
        require_keys_eq!(
            ctx.accounts.finance_token_account.owner,
            ctx.accounts.authority.key(),
            ConstruktError::WrongTokenOwner
        );
        if ctx.accounts.work_package.is_milestone_mode() {
            require!(
                ctx.accounts.work_package.allocated_milestone_amount
                    == ctx.accounts.work_package.cap_amount,
                ConstruktError::InvalidStatus
            );
        }

        let remaining_capacity = ctx.accounts.work_package.remaining_funding_capacity()?;
        require!(
            amount <= remaining_capacity,
            ConstruktError::InsufficientRemainingCap
        );
        let next_funded_amount = ctx
            .accounts
            .work_package
            .funded_amount
            .checked_add(amount)
            .ok_or(error!(ConstruktError::ArithmeticOverflow))?;

        let cpi_accounts = Transfer {
            from: ctx.accounts.finance_token_account.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        token::transfer(cpi_ctx, amount)?;

        let work_package = &mut ctx.accounts.work_package;
        work_package.funded_amount = next_funded_amount;

        emit!(EscrowFunded {
            project: work_package.project,
            work_package: work_package.key(),
            authority: ctx.accounts.authority.key(),
            mint: work_package.mint,
            vault: work_package.vault,
            amount,
            funded_amount: work_package.funded_amount,
        });

        Ok(())
    }

    pub fn assign_role(ctx: Context<AssignRole>, role: Role, wallet: Pubkey) -> Result<()> {
        require_keys_eq!(
            ctx.accounts.authority.key(),
            ctx.accounts.project.authority,
            ConstruktError::Unauthorized
        );
        require_keys_eq!(
            ctx.accounts.work_package.project,
            ctx.accounts.project.key(),
            ConstruktError::InvalidAccountRelationship
        );
        require!(
            wallet != Pubkey::default(),
            ConstruktError::InvalidAccountRelationship
        );
        if role == Role::Contractor {
            require_keys_eq!(
                wallet,
                ctx.accounts.work_package.contractor,
                ConstruktError::InvalidAccountRelationship
            );
        } else if let Some(opposing_role) = role.opposing_approver() {
            let (expected_opposing_assignment, _) = Pubkey::find_program_address(
                &[
                    b"role",
                    ctx.accounts.work_package.key().as_ref(),
                    &[opposing_role.to_u8()],
                    wallet.as_ref(),
                ],
                ctx.program_id,
            );
            let opposing_assignment = ctx
                .accounts
                .opposing_approver_role_assignment
                .to_account_info();
            require_keys_eq!(
                opposing_assignment.key(),
                expected_opposing_assignment,
                ConstruktError::InvalidAccountRelationship
            );
            require!(
                opposing_assignment.data_is_empty(),
                ConstruktError::ApproverRoleConflict
            );
        }

        let clock = Clock::get()?;
        let authority_key = ctx.accounts.authority.key();
        let role_assignment = &mut ctx.accounts.role_assignment;
        role_assignment.work_package = ctx.accounts.work_package.key();
        role_assignment.wallet = wallet;
        role_assignment.role = role;
        role_assignment.active = true;
        role_assignment.assigned_by = authority_key;
        role_assignment.assigned_at = clock.unix_timestamp;
        role_assignment.updated_by = authority_key;
        role_assignment.updated_at = clock.unix_timestamp;
        role_assignment.bump = ctx.bumps.role_assignment;

        emit!(RoleAssigned {
            work_package: role_assignment.work_package,
            wallet,
            role,
            assigned_by: role_assignment.assigned_by,
            assigned_at: role_assignment.assigned_at,
        });

        Ok(())
    }

    pub fn set_role_active(ctx: Context<SetRoleActive>, active: bool) -> Result<()> {
        require!(
            ctx.accounts.role_assignment.active != active,
            ConstruktError::RoleAlreadyInRequestedState
        );

        let clock = Clock::get()?;
        let authority_key = ctx.accounts.authority.key();
        let role_assignment = &mut ctx.accounts.role_assignment;
        role_assignment.active = active;
        role_assignment.updated_by = authority_key;
        role_assignment.updated_at = clock.unix_timestamp;

        emit!(RoleSetActive {
            work_package: role_assignment.work_package,
            wallet: role_assignment.wallet,
            role: role_assignment.role,
            active,
            authority: authority_key,
            updated_at: clock.unix_timestamp,
        });

        Ok(())
    }

    pub fn submit_payment_request(
        ctx: Context<SubmitPaymentRequest>,
        request_id: u64,
        amount: u64,
        document_ref: String,
        has_milestone: bool,
    ) -> Result<()> {
        require!(amount > 0, ConstruktError::InvalidAmount);
        require!(
            !document_ref.is_empty(),
            ConstruktError::MissingDocumentReference
        );
        require!(
            document_ref.len() <= MAX_REF_LEN,
            ConstruktError::StringTooLong
        );

        let work_package_key = ctx.accounts.work_package.key();
        let contractor_key = ctx.accounts.contractor.key();
        let milestone_key = if has_milestone {
            ctx.accounts.milestone.key()
        } else {
            Pubkey::default()
        };

        let expected_request_id = {
            let wp = &ctx.accounts.work_package;
            require!(
                wp.status == WorkPackageStatus::Active,
                ConstruktError::InvalidStatus
            );
            require_keys_eq!(contractor_key, wp.contractor, ConstruktError::Unauthorized);
            let next_request_id = wp.next_request_id()?;
            require!(
                request_id == next_request_id,
                ConstruktError::InvalidRequestId
            );

            let funded_remaining = wp.available_funded_amount_for_new_request()?;
            require!(
                amount <= funded_remaining,
                ConstruktError::InsufficientVaultBalance
            );

            if has_milestone {
                require!(wp.is_milestone_mode(), ConstruktError::InvalidStatus);
                let milestone =
                    read_milestone_account(&ctx.accounts.milestone, ctx.program_id)?;
                require_keys_eq!(
                    milestone.work_package,
                    work_package_key,
                    ConstruktError::InvalidAccountRelationship
                );
                require!(
                    milestone.status == MilestoneStatus::Active,
                    ConstruktError::InvalidStatus
                );
                require!(
                    !milestone.has_active_request,
                    ConstruktError::ActiveRequestExists
                );
                require!(
                    amount <= milestone.remaining_release_capacity()?,
                    ConstruktError::InsufficientRemainingCap
                );
            } else {
                require!(!wp.is_milestone_mode(), ConstruktError::InvalidStatus);
                require!(!wp.has_active_request, ConstruktError::ActiveRequestExists);
                let remaining_package_cap = wp.remaining_release_capacity()?;
                require!(
                    amount <= remaining_package_cap,
                    ConstruktError::InsufficientRemainingCap
                );
            }
            next_request_id
        };

        // The vault still needs real liquidity even when tracked funding allows the request.
        require!(
            amount <= ctx.accounts.vault.amount,
            ConstruktError::InsufficientVaultBalance
        );

        let payment_request_key = ctx.accounts.payment_request.key();
        let clock = Clock::get()?;

        let payment_request = &mut ctx.accounts.payment_request;
        payment_request.work_package = work_package_key;
        payment_request.request_id = expected_request_id;
        payment_request.contractor = contractor_key;
        payment_request.amount = amount;
        payment_request.has_milestone = has_milestone;
        payment_request.milestone = milestone_key;
        payment_request.document_ref = document_ref.clone();
        payment_request.status = PaymentRequestStatus::Submitted;
        payment_request.submitted_at = clock.unix_timestamp;
        payment_request.updated_at = clock.unix_timestamp;
        payment_request.released_amount = 0;
        payment_request.hold_active = false;
        payment_request.hold_by = Pubkey::default();
        payment_request.hold_ref = String::new();
        payment_request.bump = ctx.bumps.payment_request;

        {
            let work_package = &mut ctx.accounts.work_package;
            work_package.request_counter = expected_request_id;
            work_package.reserve_request_amount(amount)?;
            if !has_milestone {
                work_package.mark_active_request(payment_request_key);
            }
        }
        if has_milestone {
            let mut milestone =
                read_milestone_account(&ctx.accounts.milestone, ctx.program_id)?;
            milestone.mark_active_request(payment_request_key);
            write_milestone_account(&ctx.accounts.milestone, &milestone)?;
        }

        emit!(PaymentRequestSubmitted {
            work_package: work_package_key,
            payment_request: payment_request_key,
            contractor: contractor_key,
            amount,
            has_milestone,
            milestone: milestone_key,
            document_ref,
            submitted_at: clock.unix_timestamp,
        });

        Ok(())
    }

    pub fn add_document_reference(
        ctx: Context<AddDocumentReference>,
        document_ref: String,
    ) -> Result<()> {
        require!(
            !document_ref.is_empty(),
            ConstruktError::MissingDocumentReference
        );
        require!(
            document_ref.len() <= MAX_REF_LEN,
            ConstruktError::StringTooLong
        );

        {
            let pr = &ctx.accounts.payment_request;
            require!(!pr.is_terminal(), ConstruktError::InvalidStatus);
            require!(!pr.hold_active, ConstruktError::RequestOnHold);
            require_keys_eq!(
                ctx.accounts.contractor.key(),
                pr.contractor,
                ConstruktError::Unauthorized
            );
            require!(
                pr.document_ref != document_ref,
                ConstruktError::DocumentReferenceUnchanged
            );
        }

        let contractor_key = ctx.accounts.contractor.key();
        let payment_request_key = ctx.accounts.payment_request.key();
        let clock = Clock::get()?;

        let payment_request = &mut ctx.accounts.payment_request;
        payment_request.document_ref = document_ref.clone();
        payment_request.updated_at = clock.unix_timestamp;

        emit!(DocumentReferenceUpdated {
            payment_request: payment_request_key,
            contractor: contractor_key,
            document_ref,
            updated_at: clock.unix_timestamp,
        });

        Ok(())
    }

    pub fn approve_request(
        ctx: Context<ApproveRequest>,
        role: Role,
        note_ref: String,
    ) -> Result<()> {
        require!(
            note_ref.len() <= MAX_NOTE_REF_LEN,
            ConstruktError::StringTooLong
        );
        require!(
            role == Role::LowApprover || role == Role::HighApprover,
            ConstruktError::InvalidRole
        );
        require_keys_neq!(
            ctx.accounts.approver.key(),
            ctx.accounts.payment_request.contractor,
            ConstruktError::ContractorCannotApprove
        );

        let payment_request_status = ctx.accounts.payment_request.status;
        require!(
            !ctx.accounts.payment_request.hold_active,
            ConstruktError::RequestOnHold
        );
        require!(
            !ctx.accounts.payment_request.is_terminal(),
            ConstruktError::InvalidStatus
        );

        match role {
            Role::LowApprover => require!(
                payment_request_status == PaymentRequestStatus::Submitted,
                ConstruktError::InvalidApprovalOrder
            ),
            Role::HighApprover => require!(
                payment_request_status == PaymentRequestStatus::LowApproved,
                ConstruktError::InvalidApprovalOrder
            ),
            _ => return err!(ConstruktError::InvalidRole),
        }

        let new_status = match role {
            Role::LowApprover => PaymentRequestStatus::LowApproved,
            Role::HighApprover => PaymentRequestStatus::HighApproved,
            _ => return err!(ConstruktError::InvalidRole),
        };

        let approver_key = ctx.accounts.approver.key();
        let payment_request_key = ctx.accounts.payment_request.key();
        let clock = Clock::get()?;

        let approval_record = &mut ctx.accounts.approval_record;
        approval_record.payment_request = payment_request_key;
        approval_record.approver = approver_key;
        approval_record.role = role;
        approval_record.decision = Decision::Approved;
        approval_record.note_ref = note_ref;
        approval_record.created_at = clock.unix_timestamp;
        approval_record.bump = ctx.bumps.approval_record;

        let payment_request = &mut ctx.accounts.payment_request;
        payment_request.status = new_status;
        payment_request.updated_at = clock.unix_timestamp;

        emit!(PaymentRequestApproved {
            payment_request: payment_request_key,
            approver: approver_key,
            role,
            new_status,
            created_at: clock.unix_timestamp,
        });

        Ok(())
    }

    pub fn reject_request(
        ctx: Context<RejectRequest>,
        role: Role,
        note_ref: String,
    ) -> Result<()> {
        require!(
            note_ref.len() <= MAX_NOTE_REF_LEN,
            ConstruktError::StringTooLong
        );
        require!(
            role == Role::LowApprover || role == Role::HighApprover,
            ConstruktError::InvalidRole
        );
        require_keys_neq!(
            ctx.accounts.approver.key(),
            ctx.accounts.payment_request.contractor,
            ConstruktError::ContractorCannotApprove
        );

        require!(
            !ctx.accounts.payment_request.is_terminal(),
            ConstruktError::InvalidStatus
        );
        require!(
            !ctx.accounts.payment_request.hold_active,
            ConstruktError::RequestOnHold
        );

        let approver_key = ctx.accounts.approver.key();
        let payment_request_key = ctx.accounts.payment_request.key();
        let work_package_key = ctx.accounts.work_package.key();
        let clock = Clock::get()?;

        let approval_record = &mut ctx.accounts.approval_record;
        approval_record.payment_request = payment_request_key;
        approval_record.approver = approver_key;
        approval_record.role = role;
        approval_record.decision = Decision::Rejected;
        approval_record.note_ref = note_ref;
        approval_record.created_at = clock.unix_timestamp;
        approval_record.bump = ctx.bumps.approval_record;

        let request_amount = ctx.accounts.payment_request.amount;
        let request_has_milestone = ctx.accounts.payment_request.has_milestone;
        let request_milestone = ctx.accounts.payment_request.milestone;

        let payment_request = &mut ctx.accounts.payment_request;
        payment_request.status = PaymentRequestStatus::Rejected;
        payment_request.updated_at = clock.unix_timestamp;

        {
            let work_package = &mut ctx.accounts.work_package;
            work_package.release_reserved_request_amount(request_amount)?;
            if !request_has_milestone {
                work_package.clear_active_request();
            }
        }
        if request_has_milestone {
            let mut milestone =
                read_milestone_account(&ctx.accounts.milestone, ctx.program_id)?;
            require_keys_eq!(
                ctx.accounts.milestone.key(),
                request_milestone,
                ConstruktError::InvalidAccountRelationship
            );
            require_keys_eq!(
                milestone.work_package,
                work_package_key,
                ConstruktError::InvalidAccountRelationship
            );
            milestone.clear_active_request();
            write_milestone_account(&ctx.accounts.milestone, &milestone)?;
        }

        emit!(PaymentRequestRejected {
            payment_request: payment_request_key,
            work_package: work_package_key,
            approver: approver_key,
            role,
            decision: Decision::Rejected,
            new_status: PaymentRequestStatus::Rejected,
            created_at: clock.unix_timestamp,
        });

        Ok(())
    }

    pub fn place_hold(ctx: Context<PlaceHold>, hold_ref: String) -> Result<()> {
        require!(hold_ref.len() <= MAX_REF_LEN, ConstruktError::StringTooLong);
        require!(
            ctx.accounts.payment_request.status != PaymentRequestStatus::Released,
            ConstruktError::RequestAlreadyReleased
        );
        require!(
            !ctx.accounts.payment_request.is_terminal(),
            ConstruktError::InvalidStatus
        );
        require!(
            !ctx.accounts.payment_request.hold_active,
            ConstruktError::HoldAlreadyActive
        );

        let authority_key = ctx.accounts.authority.key();
        let payment_request_key = ctx.accounts.payment_request.key();
        let work_package_key = ctx.accounts.work_package.key();
        let clock = Clock::get()?;

        let payment_request = &mut ctx.accounts.payment_request;
        payment_request.hold_active = true;
        payment_request.hold_by = authority_key;
        payment_request.hold_ref = hold_ref.clone();
        payment_request.updated_at = clock.unix_timestamp;

        emit!(HoldPlaced {
            payment_request: payment_request_key,
            work_package: work_package_key,
            authority: authority_key,
            hold_ref,
            created_at: clock.unix_timestamp,
        });

        Ok(())
    }

    pub fn remove_hold(ctx: Context<RemoveHold>) -> Result<()> {
        require!(
            ctx.accounts.payment_request.hold_active,
            ConstruktError::HoldNotActive
        );

        let authority_key = ctx.accounts.authority.key();
        let payment_request_key = ctx.accounts.payment_request.key();
        let work_package_key = ctx.accounts.work_package.key();
        let clock = Clock::get()?;

        let payment_request = &mut ctx.accounts.payment_request;
        payment_request.hold_active = false;
        payment_request.hold_by = Pubkey::default();
        payment_request.hold_ref = String::new();
        payment_request.updated_at = clock.unix_timestamp;

        emit!(HoldRemoved {
            payment_request: payment_request_key,
            work_package: work_package_key,
            authority: authority_key,
            created_at: clock.unix_timestamp,
        });

        Ok(())
    }

    pub fn release_payment(
        ctx: Context<ReleasePayment>,
    ) -> Result<()> {
        require!(
            ctx.accounts.payment_request.status != PaymentRequestStatus::Released,
            ConstruktError::RequestAlreadyReleased
        );
        // Keep re-release failures distinct from other invalid status failures.
        require!(
            ctx.accounts.payment_request.status == PaymentRequestStatus::LowApproved
                || ctx.accounts.payment_request.status == PaymentRequestStatus::HighApproved,
            ConstruktError::InvalidStatus
        );
        require!(
            ctx.accounts.work_package.status == WorkPackageStatus::Active,
            ConstruktError::InvalidStatus
        );
        require!(
            !ctx.accounts.payment_request.hold_active,
            ConstruktError::RequestOnHold
        );
        require_keys_eq!(
            ctx.accounts.contractor_token_account.owner,
            ctx.accounts.payment_request.contractor,
            ConstruktError::WrongTokenOwner
        );
        require_keys_eq!(
            ctx.accounts.contractor_token_account.mint,
            ctx.accounts.work_package.mint,
            ConstruktError::WrongMint
        );
        require_keys_eq!(
            ctx.accounts.vault.mint,
            ctx.accounts.work_package.mint,
            ConstruktError::WrongMint
        );
        require_keys_eq!(
            ctx.accounts.vault.owner,
            ctx.accounts.vault_authority.key(),
            ConstruktError::InvalidAccountRelationship
        );

        let amount = ctx.accounts.payment_request.amount;
        let remaining_cap = ctx
            .accounts
            .work_package
            .cap_amount
            .checked_sub(ctx.accounts.work_package.released_amount)
            .ok_or(error!(ConstruktError::ArithmeticOverflow))?;
        require!(
            amount <= remaining_cap,
            ConstruktError::InsufficientRemainingCap
        );
        // Require both tracked funding and real vault liquidity: direct deposits do not expand budget.
        let funded_remaining = ctx
            .accounts
            .work_package
            .funded_amount
            .checked_sub(ctx.accounts.work_package.released_amount)
            .ok_or(error!(ConstruktError::ArithmeticOverflow))?;
        require!(
            amount <= funded_remaining,
            ConstruktError::InsufficientVaultBalance
        );
        require!(
            amount <= ctx.accounts.vault.amount,
            ConstruktError::InsufficientVaultBalance
        );
        let next_released_amount = ctx
            .accounts
            .work_package
            .released_amount
            .checked_add(amount)
            .ok_or(error!(ConstruktError::ArithmeticOverflow))?;

        let work_package_key = ctx.accounts.work_package.key();
        let signer_seeds: &[&[&[u8]]] = &[&[
            b"vault_authority",
            work_package_key.as_ref(),
            &[ctx.accounts.work_package.vault_authority_bump],
        ]];
        let cpi_accounts = Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.contractor_token_account.to_account_info(),
            authority: ctx.accounts.vault_authority.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            signer_seeds,
        );
        token::transfer(cpi_ctx, amount)?;

        let authority_key = ctx.accounts.authority.key();
        let contractor_key = ctx.accounts.payment_request.contractor;
        let payment_request_key = ctx.accounts.payment_request.key();
        let vault_key = ctx.accounts.vault.key();
        let contractor_token_account_key = ctx.accounts.contractor_token_account.key();
        let clock = Clock::get()?;
        let request_has_milestone = ctx.accounts.payment_request.has_milestone;
        let request_milestone = ctx.accounts.payment_request.milestone;

        let payment_request = &mut ctx.accounts.payment_request;
        payment_request.status = PaymentRequestStatus::Released;
        payment_request.released_amount = amount;
        payment_request.updated_at = clock.unix_timestamp;

        {
            let work_package = &mut ctx.accounts.work_package;
            work_package.released_amount = next_released_amount;
            work_package.release_reserved_request_amount(amount)?;
            if !request_has_milestone {
                work_package.clear_active_request();
            }
            if work_package.released_amount == work_package.cap_amount {
                work_package.status = WorkPackageStatus::Completed;
            }
        }
        if request_has_milestone {
            let mut milestone =
                read_milestone_account(&ctx.accounts.milestone, ctx.program_id)?;
            require_keys_eq!(
                ctx.accounts.milestone.key(),
                request_milestone,
                ConstruktError::InvalidAccountRelationship
            );
            require_keys_eq!(
                milestone.work_package,
                work_package_key,
                ConstruktError::InvalidAccountRelationship
            );
            let next_milestone_released_amount = milestone
                .released_amount
                .checked_add(amount)
                .ok_or(error!(ConstruktError::ArithmeticOverflow))?;
            require!(
                next_milestone_released_amount <= milestone.amount,
                ConstruktError::InsufficientRemainingCap
            );
            milestone.released_amount = next_milestone_released_amount;
            milestone.clear_active_request();
            if milestone.released_amount == milestone.amount {
                milestone.status = MilestoneStatus::Completed;
            }
            write_milestone_account(&ctx.accounts.milestone, &milestone)?;
        }

        emit!(PaymentReleased {
            payment_request: payment_request_key,
            work_package: work_package_key,
            authority: authority_key,
            contractor: contractor_key,
            vault: vault_key,
            contractor_token_account: contractor_token_account_key,
            amount,
            has_milestone: request_has_milestone,
            milestone: request_milestone,
            released_amount: next_released_amount,
            created_at: clock.unix_timestamp,
        });

        Ok(())
    }
}

// Account contexts

#[derive(Accounts)]
#[instruction(project_id: u64)]
pub struct InitializeProject<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        space = ProjectAccount::SPACE,
        seeds = [b"project", authority.key().as_ref(), &project_id.to_le_bytes()],
        bump
    )]
    pub project: Account<'info, ProjectAccount>,
    pub mint: Account<'info, Mint>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(package_id: u64)]
pub struct CreateWorkPackage<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(mut, has_one = authority @ ConstruktError::Unauthorized)]
    pub project: Account<'info, ProjectAccount>,
    #[account(
        init,
        payer = authority,
        space = WorkPackageAccount::SPACE,
        seeds = [b"work_package", project.key().as_ref(), &package_id.to_le_bytes()],
        bump
    )]
    pub work_package: Account<'info, WorkPackageAccount>,
    /// CHECK: PDA authority for the work package vault. The seeds constraint verifies it.
    #[account(
        seeds = [b"vault_authority", work_package.key().as_ref()],
        bump
    )]
    pub vault_authority: UncheckedAccount<'info>,
    #[account(address = project.mint @ ConstruktError::WrongMint)]
    pub mint: Account<'info, Mint>,
    #[account(
        init,
        payer = authority,
        associated_token::mint = mint,
        associated_token::authority = vault_authority
    )]
    pub vault: Account<'info, TokenAccount>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FundEscrow<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(has_one = authority @ ConstruktError::Unauthorized)]
    pub project: Account<'info, ProjectAccount>,
    #[account(
        mut,
        constraint = work_package.project == project.key() @ ConstruktError::InvalidAccountRelationship
    )]
    pub work_package: Account<'info, WorkPackageAccount>,
    #[account(address = work_package.mint @ ConstruktError::WrongMint)]
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub finance_token_account: Account<'info, TokenAccount>,
    #[account(mut, address = work_package.vault @ ConstruktError::InvalidAccountRelationship)]
    pub vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(milestone_id: u64)]
pub struct CreateMilestone<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(has_one = authority @ ConstruktError::Unauthorized)]
    pub project: Account<'info, ProjectAccount>,
    #[account(
        mut,
        constraint = work_package.project == project.key() @ ConstruktError::InvalidAccountRelationship
    )]
    pub work_package: Account<'info, WorkPackageAccount>,
    #[account(
        init,
        payer = authority,
        space = MilestoneAccount::SPACE,
        seeds = [b"milestone", work_package.key().as_ref(), &milestone_id.to_le_bytes()],
        bump
    )]
    pub milestone: Account<'info, MilestoneAccount>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(role: Role, wallet: Pubkey)]
pub struct AssignRole<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(has_one = authority @ ConstruktError::Unauthorized)]
    pub project: Account<'info, ProjectAccount>,
    #[account(
        mut,
        constraint = work_package.project == project.key() @ ConstruktError::InvalidAccountRelationship
    )]
    pub work_package: Account<'info, WorkPackageAccount>,
    #[account(
        init,
        payer = authority,
        space = RoleAssignmentAccount::SPACE,
        seeds = [b"role", work_package.key().as_ref(), &[role.to_u8()], wallet.as_ref()],
        bump
    )]
    pub role_assignment: Account<'info, RoleAssignmentAccount>,
    /// CHECK: For approver roles this must be the opposite approver role PDA for the same wallet.
    pub opposing_approver_role_assignment: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetRoleActive<'info> {
    pub authority: Signer<'info>,
    #[account(has_one = authority @ ConstruktError::Unauthorized)]
    pub project: Account<'info, ProjectAccount>,
    #[account(
        constraint = work_package.project == project.key() @ ConstruktError::InvalidAccountRelationship
    )]
    pub work_package: Account<'info, WorkPackageAccount>,
    #[account(
        mut,
        constraint = role_assignment.work_package == work_package.key() @ ConstruktError::InvalidAccountRelationship
    )]
    pub role_assignment: Account<'info, RoleAssignmentAccount>,
}

#[derive(Accounts)]
#[instruction(request_id: u64)]
pub struct SubmitPaymentRequest<'info> {
    #[account(mut)]
    pub contractor: Signer<'info>,
    pub project: Account<'info, ProjectAccount>,
    #[account(
        mut,
        constraint = work_package.project == project.key() @ ConstruktError::InvalidAccountRelationship
    )]
    pub work_package: Account<'info, WorkPackageAccount>,
    #[account(
        seeds = [b"role", work_package.key().as_ref(), &[Role::Contractor.to_u8()], contractor.key().as_ref()],
        bump = contractor_role_assignment.bump,
        constraint = contractor_role_assignment.active @ ConstruktError::InactiveRoleAssignment,
        constraint = contractor_role_assignment.work_package == work_package.key() @ ConstruktError::InvalidAccountRelationship
    )]
    pub contractor_role_assignment: Account<'info, RoleAssignmentAccount>,
    #[account(
        init,
        payer = contractor,
        space = PaymentRequestAccount::SPACE,
        seeds = [b"payment_request", work_package.key().as_ref(), &request_id.to_le_bytes()],
        bump
    )]
    pub payment_request: Account<'info, PaymentRequestAccount>,
    /// CHECK: When the request targets a milestone this must be the milestone account.
    #[account(mut)]
    pub milestone: UncheckedAccount<'info>,
    #[account(address = work_package.vault @ ConstruktError::InvalidAccountRelationship)]
    pub vault: Account<'info, TokenAccount>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AddDocumentReference<'info> {
    pub contractor: Signer<'info>,
    pub project: Account<'info, ProjectAccount>,
    #[account(
        constraint = work_package.project == project.key() @ ConstruktError::InvalidAccountRelationship
    )]
    pub work_package: Account<'info, WorkPackageAccount>,
    #[account(
        mut,
        constraint = payment_request.work_package == work_package.key() @ ConstruktError::InvalidAccountRelationship
    )]
    pub payment_request: Account<'info, PaymentRequestAccount>,
    #[account(
        seeds = [b"role", work_package.key().as_ref(), &[Role::Contractor.to_u8()], contractor.key().as_ref()],
        bump = contractor_role_assignment.bump,
        constraint = contractor_role_assignment.active @ ConstruktError::InactiveRoleAssignment,
        constraint = contractor_role_assignment.work_package == work_package.key() @ ConstruktError::InvalidAccountRelationship
    )]
    pub contractor_role_assignment: Account<'info, RoleAssignmentAccount>,
}

#[derive(Accounts)]
#[instruction(role: Role)]
pub struct ApproveRequest<'info> {
    #[account(mut)]
    pub approver: Signer<'info>,
    pub project: Account<'info, ProjectAccount>,
    #[account(
        constraint = work_package.project == project.key() @ ConstruktError::InvalidAccountRelationship
    )]
    pub work_package: Account<'info, WorkPackageAccount>,
    #[account(
        mut,
        constraint = payment_request.work_package == work_package.key() @ ConstruktError::InvalidAccountRelationship
    )]
    pub payment_request: Account<'info, PaymentRequestAccount>,
    #[account(
        seeds = [b"role", work_package.key().as_ref(), &[role.to_u8()], approver.key().as_ref()],
        bump = approver_role_assignment.bump,
        constraint = approver_role_assignment.active @ ConstruktError::InactiveRoleAssignment,
        constraint = approver_role_assignment.work_package == work_package.key() @ ConstruktError::InvalidAccountRelationship
    )]
    pub approver_role_assignment: Account<'info, RoleAssignmentAccount>,
    #[account(
        init,
        payer = approver,
        space = ApprovalRecord::SPACE,
        seeds = [b"approval", payment_request.key().as_ref(), &[role.to_u8()]],
        bump
    )]
    pub approval_record: Account<'info, ApprovalRecord>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(role: Role)]
pub struct RejectRequest<'info> {
    #[account(mut)]
    pub approver: Signer<'info>,
    pub project: Account<'info, ProjectAccount>,
    #[account(
        mut,
        constraint = work_package.project == project.key() @ ConstruktError::InvalidAccountRelationship
    )]
    pub work_package: Account<'info, WorkPackageAccount>,
    #[account(
        mut,
        constraint = payment_request.work_package == work_package.key() @ ConstruktError::InvalidAccountRelationship
    )]
    pub payment_request: Account<'info, PaymentRequestAccount>,
    #[account(
        seeds = [b"role", work_package.key().as_ref(), &[role.to_u8()], approver.key().as_ref()],
        bump = approver_role_assignment.bump,
        constraint = approver_role_assignment.active @ ConstruktError::InactiveRoleAssignment,
        constraint = approver_role_assignment.work_package == work_package.key() @ ConstruktError::InvalidAccountRelationship
    )]
    pub approver_role_assignment: Account<'info, RoleAssignmentAccount>,
    #[account(
        init,
        payer = approver,
        space = ApprovalRecord::SPACE,
        seeds = [b"approval", payment_request.key().as_ref(), &[role.to_u8()]],
        bump
    )]
    pub approval_record: Account<'info, ApprovalRecord>,
    /// CHECK: When the request targets a milestone this must be the milestone account.
    #[account(mut)]
    pub milestone: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PlaceHold<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(has_one = authority @ ConstruktError::Unauthorized)]
    pub project: Account<'info, ProjectAccount>,
    #[account(
        constraint = work_package.project == project.key() @ ConstruktError::InvalidAccountRelationship
    )]
    pub work_package: Account<'info, WorkPackageAccount>,
    #[account(
        mut,
        constraint = payment_request.work_package == work_package.key() @ ConstruktError::InvalidAccountRelationship
    )]
    pub payment_request: Account<'info, PaymentRequestAccount>,
}

#[derive(Accounts)]
pub struct RemoveHold<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(has_one = authority @ ConstruktError::Unauthorized)]
    pub project: Account<'info, ProjectAccount>,
    #[account(
        constraint = work_package.project == project.key() @ ConstruktError::InvalidAccountRelationship
    )]
    pub work_package: Account<'info, WorkPackageAccount>,
    #[account(
        mut,
        constraint = payment_request.work_package == work_package.key() @ ConstruktError::InvalidAccountRelationship
    )]
    pub payment_request: Account<'info, PaymentRequestAccount>,
}

#[derive(Accounts)]
pub struct ReleasePayment<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(has_one = authority @ ConstruktError::Unauthorized)]
    pub project: Account<'info, ProjectAccount>,
    #[account(
        mut,
        constraint = work_package.project == project.key() @ ConstruktError::InvalidAccountRelationship
    )]
    pub work_package: Account<'info, WorkPackageAccount>,
    #[account(
        mut,
        constraint = payment_request.work_package == work_package.key() @ ConstruktError::InvalidAccountRelationship
    )]
    pub payment_request: Account<'info, PaymentRequestAccount>,
    /// CHECK: When the request targets a milestone this must be the milestone account.
    #[account(mut)]
    pub milestone: UncheckedAccount<'info>,
    /// CHECK: PDA authority for the work package vault. The seeds constraint verifies it.
    #[account(
        seeds = [b"vault_authority", work_package.key().as_ref()],
        bump = work_package.vault_authority_bump
    )]
    pub vault_authority: UncheckedAccount<'info>,
    #[account(mut, address = work_package.vault @ ConstruktError::InvalidAccountRelationship)]
    pub vault: Account<'info, TokenAccount>,
    #[account(mut)]
    pub contractor_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

// Account structs

#[account]
pub struct ProjectAccount {
    pub authority: Pubkey,
    pub project_id: u64,
    pub mint: Pubkey,
    pub budget_amount: u64,
    pub allocated_amount: u64,
    pub name: String,
    pub status: ProjectStatus,
    pub created_at: i64,
    pub metadata_ref: String,
    /// Stored for account provenance and future PDA signer paths.
    pub bump: u8,
}

impl ProjectAccount {
    pub const SPACE: usize = 8
        + 32
        + 8
        + 32
        + 8
        + 8
        + string_space(MAX_NAME_LEN)
        + 1
        + 8
        + string_space(MAX_REF_LEN)
        + 1;

    pub fn remaining_allocatable_amount(&self) -> Result<u64> {
        self.budget_amount
            .checked_sub(self.allocated_amount)
            .ok_or(error!(ConstruktError::ArithmeticOverflow))
    }

    pub fn allocate_package_cap(&self, cap_amount: u64) -> Result<u64> {
        let remaining = self.remaining_allocatable_amount()?;
        require!(
            cap_amount <= remaining,
            ConstruktError::InsufficientRemainingCap
        );
        self.allocated_amount
            .checked_add(cap_amount)
            .ok_or(error!(ConstruktError::ArithmeticOverflow))
    }
}

#[account]
pub struct WorkPackageAccount {
    pub project: Pubkey,
    pub package_id: u64,
    pub cap_amount: u64,
    pub funded_amount: u64,
    pub released_amount: u64,
    pub reserved_request_amount: u64,
    pub allocated_milestone_amount: u64,
    pub milestone_counter: u64,
    pub contractor: Pubkey,
    pub mint: Pubkey,
    pub vault: Pubkey,
    pub vault_authority_bump: u8,
    pub status: WorkPackageStatus,
    pub scope_ref: String,
    pub request_counter: u64,
    pub has_active_request: bool,
    pub active_request: Pubkey,
    /// Stored for account provenance and future PDA signer paths.
    pub bump: u8,
}

impl WorkPackageAccount {
    pub const SPACE: usize = 8
        + 32
        + 8
        + 8
        + 8
        + 8
        + 8
        + 8
        + 8
        + 32
        + 32
        + 32
        + 1
        + 1
        + string_space(MAX_REF_LEN)
        + 8
        + 1
        + 32
        + 1;

    pub fn remaining_funding_capacity(&self) -> Result<u64> {
        self.cap_amount
            .checked_sub(self.funded_amount)
            .ok_or(error!(ConstruktError::ArithmeticOverflow))
    }

    pub fn remaining_release_capacity(&self) -> Result<u64> {
        self.cap_amount
            .checked_sub(self.released_amount)
            .ok_or(error!(ConstruktError::ArithmeticOverflow))
    }

    pub fn next_request_id(&self) -> Result<u64> {
        self.request_counter
            .checked_add(1)
            .ok_or(error!(ConstruktError::ArithmeticOverflow))
    }

    pub fn next_milestone_id(&self) -> Result<u64> {
        self.milestone_counter
            .checked_add(1)
            .ok_or(error!(ConstruktError::ArithmeticOverflow))
    }

    pub fn is_milestone_mode(&self) -> bool {
        self.milestone_counter > 0
    }

    pub fn remaining_milestone_allocation(&self) -> Result<u64> {
        self.cap_amount
            .checked_sub(self.allocated_milestone_amount)
            .ok_or(error!(ConstruktError::ArithmeticOverflow))
    }

    pub fn allocate_milestone_amount(&self, amount: u64) -> Result<u64> {
        let remaining = self.remaining_milestone_allocation()?;
        require!(
            amount <= remaining,
            ConstruktError::InsufficientRemainingCap
        );
        self.allocated_milestone_amount
            .checked_add(amount)
            .ok_or(error!(ConstruktError::ArithmeticOverflow))
    }

    pub fn available_funded_amount_for_new_request(&self) -> Result<u64> {
        let funded_remaining = self
            .funded_amount
            .checked_sub(self.released_amount)
            .ok_or(error!(ConstruktError::ArithmeticOverflow))?;
        funded_remaining
            .checked_sub(self.reserved_request_amount)
            .ok_or(error!(ConstruktError::ArithmeticOverflow))
    }

    pub fn reserve_request_amount(&mut self, amount: u64) -> Result<()> {
        self.reserved_request_amount = self
            .reserved_request_amount
            .checked_add(amount)
            .ok_or(error!(ConstruktError::ArithmeticOverflow))?;
        Ok(())
    }

    pub fn release_reserved_request_amount(&mut self, amount: u64) -> Result<()> {
        self.reserved_request_amount = self
            .reserved_request_amount
            .checked_sub(amount)
            .ok_or(error!(ConstruktError::ArithmeticOverflow))?;
        Ok(())
    }

    pub fn mark_active_request(&mut self, request: Pubkey) {
        self.has_active_request = true;
        self.active_request = request;
    }

    pub fn clear_active_request(&mut self) {
        self.has_active_request = false;
        self.active_request = Pubkey::default();
    }
}

#[account]
pub struct MilestoneAccount {
    pub work_package: Pubkey,
    pub milestone_id: u64,
    pub amount: u64,
    pub released_amount: u64,
    pub start_at: i64,
    pub end_at: i64,
    pub status: MilestoneStatus,
    pub metadata_ref: String,
    pub has_active_request: bool,
    pub active_request: Pubkey,
    /// Stored for account provenance and future PDA signer paths.
    pub bump: u8,
}

impl MilestoneAccount {
    pub const SPACE: usize = 8
        + 32
        + 8
        + 8
        + 8
        + 8
        + 1
        + string_space(MAX_REF_LEN)
        + 1
        + 32
        + 1;

    pub fn remaining_release_capacity(&self) -> Result<u64> {
        self.amount
            .checked_sub(self.released_amount)
            .ok_or(error!(ConstruktError::ArithmeticOverflow))
    }

    pub fn mark_active_request(&mut self, request: Pubkey) {
        self.has_active_request = true;
        self.active_request = request;
    }

    pub fn clear_active_request(&mut self) {
        self.has_active_request = false;
        self.active_request = Pubkey::default();
    }
}

#[account]
pub struct RoleAssignmentAccount {
    pub work_package: Pubkey,
    pub wallet: Pubkey,
    pub role: Role,
    pub active: bool,
    pub assigned_by: Pubkey,
    pub assigned_at: i64,
    pub updated_by: Pubkey,
    pub updated_at: i64,
    pub bump: u8,
}

impl RoleAssignmentAccount {
    pub const SPACE: usize = 8 + 32 + 32 + 1 + 1 + 32 + 8 + 32 + 8 + 1;
}

#[account]
pub struct PaymentRequestAccount {
    pub work_package: Pubkey,
    pub request_id: u64,
    pub contractor: Pubkey,
    pub amount: u64,
    pub has_milestone: bool,
    pub milestone: Pubkey,
    pub document_ref: String,
    pub status: PaymentRequestStatus,
    pub submitted_at: i64,
    pub updated_at: i64,
    /// V0 releases a request in full, so this is either 0 or equal to `amount`.
    pub released_amount: u64,
    pub hold_active: bool,
    pub hold_by: Pubkey,
    pub hold_ref: String,
    /// Stored for account provenance and future PDA signer paths.
    pub bump: u8,
}

impl PaymentRequestAccount {
    pub const SPACE: usize = 8
        + 32
        + 8
        + 32
        + 8
        + 1
        + 32
        + string_space(MAX_REF_LEN)
        + 1
        + 8
        + 8
        + 8
        + 1
        + 32
        + string_space(MAX_REF_LEN)
        + 1;

    pub fn is_terminal(&self) -> bool {
        self.status == PaymentRequestStatus::Rejected
            || self.status == PaymentRequestStatus::Released
    }
}

#[account]
pub struct ApprovalRecord {
    pub payment_request: Pubkey,
    pub approver: Pubkey,
    pub role: Role,
    pub decision: Decision,
    pub note_ref: String,
    pub created_at: i64,
    /// Stored for account provenance and future PDA signer paths.
    pub bump: u8,
}

impl ApprovalRecord {
    pub const SPACE: usize = 8 + 32 + 32 + 1 + 1 + string_space(MAX_NOTE_REF_LEN) + 8 + 1;
}

// Enums

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum ProjectStatus {
    Active,
    Completed,
    Cancelled,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum WorkPackageStatus {
    Active,
    Completed,
    Cancelled,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum MilestoneStatus {
    Active,
    Completed,
    Cancelled,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum PaymentRequestStatus {
    Submitted,
    LowApproved,
    HighApproved,
    Rejected,
    Released,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum Role {
    Contractor,
    LowApprover,
    HighApprover,
}

impl Role {
    pub fn to_u8(self) -> u8 {
        match self {
            Role::Contractor => 1,
            Role::LowApprover => 2,
            Role::HighApprover => 3,
        }
    }

    pub fn opposing_approver(self) -> Option<Role> {
        match self {
            Role::LowApprover => Some(Role::HighApprover),
            Role::HighApprover => Some(Role::LowApprover),
            Role::Contractor => None,
        }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum Decision {
    Approved,
    Rejected,
}

// Events

#[event]
pub struct ProjectInitialized {
    pub project: Pubkey,
    pub authority: Pubkey,
    pub project_id: u64,
    pub mint: Pubkey,
    pub budget_amount: u64,
    pub allocated_amount: u64,
    pub created_at: i64,
}

#[event]
pub struct WorkPackageCreated {
    pub project: Pubkey,
    pub work_package: Pubkey,
    pub package_id: u64,
    pub contractor: Pubkey,
    pub mint: Pubkey,
    pub vault: Pubkey,
    pub cap_amount: u64,
    pub project_budget_amount: u64,
    pub project_allocated_amount: u64,
}

#[event]
pub struct EscrowFunded {
    pub project: Pubkey,
    pub work_package: Pubkey,
    pub authority: Pubkey,
    pub mint: Pubkey,
    pub vault: Pubkey,
    pub amount: u64,
    pub funded_amount: u64,
}

#[event]
pub struct MilestoneCreated {
    pub work_package: Pubkey,
    pub milestone: Pubkey,
    pub milestone_id: u64,
    pub amount: u64,
    pub start_at: i64,
    pub end_at: i64,
    pub allocated_milestone_amount: u64,
}

#[event]
pub struct RoleAssigned {
    pub work_package: Pubkey,
    pub wallet: Pubkey,
    pub role: Role,
    pub assigned_by: Pubkey,
    pub assigned_at: i64,
}

#[event]
pub struct RoleSetActive {
    pub work_package: Pubkey,
    pub wallet: Pubkey,
    pub role: Role,
    pub active: bool,
    pub authority: Pubkey,
    pub updated_at: i64,
}

#[event]
pub struct PaymentRequestSubmitted {
    pub work_package: Pubkey,
    pub payment_request: Pubkey,
    pub contractor: Pubkey,
    pub amount: u64,
    pub has_milestone: bool,
    pub milestone: Pubkey,
    pub document_ref: String,
    pub submitted_at: i64,
}

#[event]
pub struct DocumentReferenceUpdated {
    pub payment_request: Pubkey,
    pub contractor: Pubkey,
    pub document_ref: String,
    pub updated_at: i64,
}

#[event]
pub struct PaymentRequestApproved {
    pub payment_request: Pubkey,
    pub approver: Pubkey,
    pub role: Role,
    pub new_status: PaymentRequestStatus,
    pub created_at: i64,
}

#[event]
pub struct PaymentRequestRejected {
    pub payment_request: Pubkey,
    pub work_package: Pubkey,
    pub approver: Pubkey,
    pub role: Role,
    pub decision: Decision,
    pub new_status: PaymentRequestStatus,
    pub created_at: i64,
}

#[event]
pub struct HoldPlaced {
    pub payment_request: Pubkey,
    pub work_package: Pubkey,
    pub authority: Pubkey,
    pub hold_ref: String,
    pub created_at: i64,
}

#[event]
pub struct HoldRemoved {
    pub payment_request: Pubkey,
    pub work_package: Pubkey,
    pub authority: Pubkey,
    pub created_at: i64,
}

#[event]
pub struct PaymentReleased {
    pub payment_request: Pubkey,
    pub work_package: Pubkey,
    pub authority: Pubkey,
    pub contractor: Pubkey,
    pub vault: Pubkey,
    pub contractor_token_account: Pubkey,
    pub amount: u64,
    pub has_milestone: bool,
    pub milestone: Pubkey,
    pub released_amount: u64,
    pub created_at: i64,
}

// Errors

#[error_code]
pub enum ConstruktError {
    #[msg("Signer is not authorized for this action")]
    Unauthorized,
    #[msg("Invalid role")]
    InvalidRole,
    #[msg("Role assignment is inactive")]
    InactiveRoleAssignment,
    #[msg("Role assignment is already in the requested active state")]
    RoleAlreadyInRequestedState,
    #[msg("Wallet already has the opposing approver role for this work package")]
    ApproverRoleConflict,
    #[msg("Account relationship is invalid")]
    InvalidAccountRelationship,
    #[msg("Account or request status is invalid for this action")]
    InvalidStatus,
    #[msg("Approval order is invalid")]
    InvalidApprovalOrder,
    #[msg("Contractor cannot approve their own request")]
    ContractorCannotApprove,
    #[msg("Payment request id does not match the next request counter")]
    InvalidRequestId,
    #[msg("An active request already exists for this work package")]
    ActiveRequestExists,
    #[msg("Document reference is required")]
    MissingDocumentReference,
    #[msg("Document reference is unchanged")]
    DocumentReferenceUnchanged,
    #[msg("String is too long")]
    StringTooLong,
    #[msg("Request is on hold")]
    RequestOnHold,
    #[msg("Hold is not active")]
    HoldNotActive,
    #[msg("Hold is already active")]
    HoldAlreadyActive,
    #[msg("Request has already been released")]
    RequestAlreadyReleased,
    #[msg("Insufficient remaining cap")]
    InsufficientRemainingCap,
    #[msg("Insufficient vault balance")]
    InsufficientVaultBalance,
    #[msg("Token mint does not match expected mint")]
    WrongMint,
    #[msg("Token account owner does not match expected owner")]
    WrongTokenOwner,
    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,
    #[msg("Amount must be greater than zero")]
    InvalidAmount,
}

const fn string_space(max_len: usize) -> usize {
    4 + max_len
}

fn read_milestone_account(
    milestone: &UncheckedAccount,
    program_id: &Pubkey,
) -> Result<MilestoneAccount> {
    require_keys_eq!(
        *milestone.owner,
        *program_id,
        ConstruktError::InvalidAccountRelationship
    );
    let data = milestone.try_borrow_data()?;
    let mut data_slice: &[u8] = &data;
    MilestoneAccount::try_deserialize(&mut data_slice)
        .map_err(|_| error!(ConstruktError::InvalidAccountRelationship))
}

fn write_milestone_account(
    milestone: &UncheckedAccount,
    account: &MilestoneAccount,
) -> Result<()> {
    let mut data = milestone.try_borrow_mut_data()?;
    let mut data_slice: &mut [u8] = &mut data;
    account
        .try_serialize(&mut data_slice)
        .map_err(|_| error!(ConstruktError::InvalidAccountRelationship))
}
