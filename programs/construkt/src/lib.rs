use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("34V8k3GGFE1wZS3bghFvazcVyyDBErFPs5xRFqTpnZCL");

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
    ) -> Result<()> {
        require!(name.len() <= MAX_NAME_LEN, ConstruktError::StringTooLong);
        require!(
            metadata_ref.len() <= MAX_REF_LEN,
            ConstruktError::StringTooLong
        );

        let clock = Clock::get()?;
        let project = &mut ctx.accounts.project;
        project.authority = ctx.accounts.authority.key();
        project.project_id = project_id;
        project.name = name;
        project.status = ProjectStatus::Active;
        project.created_at = clock.unix_timestamp;
        project.metadata_ref = metadata_ref;
        project.bump = ctx.bumps.project;

        emit!(ProjectInitialized {
            project: project.key(),
            authority: project.authority,
            project_id,
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

        let work_package = &mut ctx.accounts.work_package;
        work_package.project = ctx.accounts.project.key();
        work_package.package_id = package_id;
        work_package.cap_amount = cap_amount;
        work_package.funded_amount = 0;
        work_package.released_amount = 0;
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

        emit!(WorkPackageCreated {
            project: work_package.project,
            work_package: work_package.key(),
            package_id,
            contractor,
            mint: work_package.mint,
            vault: work_package.vault,
            cap_amount,
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
        }

        let clock = Clock::get()?;
        let role_assignment = &mut ctx.accounts.role_assignment;
        role_assignment.work_package = ctx.accounts.work_package.key();
        role_assignment.wallet = wallet;
        role_assignment.role = role;
        role_assignment.active = true;
        role_assignment.assigned_by = ctx.accounts.authority.key();
        role_assignment.assigned_at = clock.unix_timestamp;
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
}

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
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(package_id: u64)]
pub struct CreateWorkPackage<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(has_one = authority @ ConstruktError::Unauthorized)]
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
    pub system_program: Program<'info, System>,
}

#[account]
pub struct ProjectAccount {
    pub authority: Pubkey,
    pub project_id: u64,
    pub name: String,
    pub status: ProjectStatus,
    pub created_at: i64,
    pub metadata_ref: String,
    pub bump: u8,
}

impl ProjectAccount {
    pub const SPACE: usize =
        8 + 32 + 8 + string_space(MAX_NAME_LEN) + 1 + 8 + string_space(MAX_REF_LEN) + 1;
}

#[account]
pub struct WorkPackageAccount {
    pub project: Pubkey,
    pub package_id: u64,
    pub cap_amount: u64,
    pub funded_amount: u64,
    pub released_amount: u64,
    pub contractor: Pubkey,
    pub mint: Pubkey,
    pub vault: Pubkey,
    pub vault_authority_bump: u8,
    pub status: WorkPackageStatus,
    pub scope_ref: String,
    pub request_counter: u64,
    pub has_active_request: bool,
    pub active_request: Pubkey,
    pub bump: u8,
}

impl WorkPackageAccount {
    pub const SPACE: usize =
        8 + 32 + 8 + 8 + 8 + 8 + 32 + 32 + 32 + 1 + 1 + string_space(MAX_REF_LEN) + 8 + 1 + 32 + 1;

    pub fn remaining_funding_capacity(&self) -> Result<u64> {
        self.cap_amount
            .checked_sub(self.funded_amount)
            .ok_or(error!(ConstruktError::ArithmeticOverflow))
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
    pub bump: u8,
}

impl RoleAssignmentAccount {
    pub const SPACE: usize = 8 + 32 + 32 + 1 + 1 + 32 + 8 + 1;
}

#[account]
pub struct PaymentRequestAccount {
    pub work_package: Pubkey,
    pub request_id: u64,
    pub contractor: Pubkey,
    pub amount: u64,
    pub document_ref: String,
    pub status: PaymentRequestStatus,
    pub submitted_at: i64,
    pub updated_at: i64,
    pub released_amount: u64,
    pub hold_active: bool,
    pub hold_by: Pubkey,
    pub hold_ref: String,
    pub bump: u8,
}

impl PaymentRequestAccount {
    pub const SPACE: usize = 8
        + 32
        + 8
        + 32
        + 8
        + string_space(MAX_REF_LEN)
        + 1
        + 8
        + 8
        + 8
        + 1
        + 32
        + string_space(MAX_REF_LEN)
        + 1;
}

#[account]
pub struct ApprovalRecord {
    pub payment_request: Pubkey,
    pub approver: Pubkey,
    pub role: Role,
    pub decision: Decision,
    pub note_ref: String,
    pub created_at: i64,
    pub bump: u8,
}

impl ApprovalRecord {
    pub const SPACE: usize = 8 + 32 + 32 + 1 + 1 + string_space(MAX_NOTE_REF_LEN) + 8 + 1;
}

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
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum Decision {
    Approved,
    Rejected,
}

#[event]
pub struct ProjectInitialized {
    pub project: Pubkey,
    pub authority: Pubkey,
    pub project_id: u64,
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
pub struct RoleAssigned {
    pub work_package: Pubkey,
    pub wallet: Pubkey,
    pub role: Role,
    pub assigned_by: Pubkey,
    pub assigned_at: i64,
}

#[error_code]
pub enum ConstruktError {
    #[msg("Signer is not authorized for this action")]
    Unauthorized,
    #[msg("Invalid role")]
    InvalidRole,
    #[msg("Role assignment is inactive")]
    InactiveRoleAssignment,
    #[msg("Account relationship is invalid")]
    InvalidAccountRelationship,
    #[msg("Account or request status is invalid for this action")]
    InvalidStatus,
    #[msg("Approval order is invalid")]
    InvalidApprovalOrder,
    #[msg("Approval already exists for this role")]
    DuplicateApproval,
    #[msg("Contractor cannot approve their own request")]
    ContractorCannotApprove,
    #[msg("An active request already exists for this work package")]
    ActiveRequestExists,
    #[msg("Document reference is required")]
    MissingDocumentReference,
    #[msg("String is too long")]
    StringTooLong,
    #[msg("Request is on hold")]
    RequestOnHold,
    #[msg("Hold is not active")]
    HoldNotActive,
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
