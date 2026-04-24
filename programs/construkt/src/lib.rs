use anchor_lang::prelude::*;

declare_id!("34V8k3GGFE1wZS3bghFvazcVyyDBErFPs5xRFqTpnZCL");

#[program]
pub mod construkt {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Construkt program initialized: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
