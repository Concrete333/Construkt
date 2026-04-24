import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Construkt } from "../target/types/construkt";

describe("construkt", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.construkt as Program<Construkt>;

  it("initializes the program scaffold", async () => {
    const tx = await program.methods.initialize().rpc();
    console.log("Transaction signature", tx);
  });
});
