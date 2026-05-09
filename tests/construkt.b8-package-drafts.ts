import * as anchor from "@coral-xyz/anchor";
import { assert } from "chai";
import { createFixture, defaultPubkey, expectError } from "./setup";

describe("construkt b8 package drafts", () => {
  const setupDraftFixture = async () => {
    const fx = createFixture();
    await fx.init();
    await fx.initializeProject();
    const projectDrafter = await fx.assignProjectDrafterForTest(
      fx.pm.publicKey
    );
    return { fx, projectDrafter };
  };

  it("authorized project drafter can create a draft package without allocating budget or vault", async () => {
    const { fx, projectDrafter } = await setupDraftFixture();
    const draft = await fx.createPackageDraftForTest(
      801,
      fx.pm,
      projectDrafter
    );

    const workPackage = await fx.program.account.workPackageAccount.fetch(
      draft.workPackage
    );
    const project = await fx.program.account.projectAccount.fetch(fx.project);

    assert.deepStrictEqual(workPackage.status, { draft: {} });
    assert.strictEqual(workPackage.capAmount.toNumber(), 1_000_000);
    assert.ok(workPackage.contractor.equals(fx.contractor.publicKey));
    assert.ok(workPackage.vault.equals(defaultPubkey));
    assert.strictEqual(workPackage.vaultAuthorityBump, 0);
    assert.strictEqual(project.allocatedAmount.toNumber(), 0);
  });

  it("unassigned and inactive drafters cannot create draft packages", async () => {
    const { fx, projectDrafter } = await setupDraftFixture();

    await expectError(
      fx.createPackageDraftForTest(
        802,
        fx.unrelatedUser,
        fx.deriveProjectDrafterAddress(fx.project, fx.unrelatedUser.publicKey)
      ),
      "AccountNotInitialized"
    );

    await fx.setProjectDrafterActiveForTest(projectDrafter, false);
    await expectError(
      fx.createPackageDraftForTest(803, fx.pm, projectDrafter),
      "InactiveRoleAssignment"
    );
  });

  it("draft packages cannot be funded before Finance activation", async () => {
    const { fx, projectDrafter } = await setupDraftFixture();
    const draft = await fx.createPackageDraftForTest(
      804,
      fx.pm,
      projectDrafter
    );

    await expectError(fx.fundPackage(draft), "AccountNotInitialized");
  });

  it("draft package ids cannot collide with existing packages or drafts", async () => {
    const { fx, projectDrafter } = await setupDraftFixture();

    await fx.createPackageDraftForTest(807, fx.pm, projectDrafter);
    await expectError(
      fx.createPackageDraftForTest(807, fx.pm, projectDrafter),
      "already in use"
    );

    await fx.createWorkPackageForTest(808);
    await expectError(
      fx.createPackageDraftForTest(808, fx.pm, projectDrafter),
      "already in use"
    );
  });

  it("Finance activates a simple draft package and then normal escrow funding works", async () => {
    const { fx, projectDrafter } = await setupDraftFixture();
    const draft = await fx.createPackageDraftForTest(
      805,
      fx.pm,
      projectDrafter
    );

    const { contractorRoleAssignment } = await fx.activateWorkPackageForTest(
      draft
    );
    await fx.fundPackage(draft, new anchor.BN(600_000));

    const workPackage = await fx.program.account.workPackageAccount.fetch(
      draft.workPackage
    );
    const project = await fx.program.account.projectAccount.fetch(fx.project);
    const contractorRole = await fx.program.account.roleAssignmentAccount.fetch(
      contractorRoleAssignment
    );

    assert.deepStrictEqual(workPackage.status, { active: {} });
    assert.ok(workPackage.vault.equals(draft.vault));
    assert.strictEqual(workPackage.fundedAmount.toNumber(), 600_000);
    assert.strictEqual(project.allocatedAmount.toNumber(), 1_000_000);
    assert.ok(contractorRole.wallet.equals(fx.contractor.publicKey));
    assert.deepStrictEqual(contractorRole.role, { contractor: {} });
    assert.isTrue(contractorRole.active);
  });

  it("Finance cannot activate the same draft twice", async () => {
    const { fx, projectDrafter } = await setupDraftFixture();
    const draft = await fx.createPackageDraftForTest(
      809,
      fx.pm,
      projectDrafter
    );

    await fx.activateWorkPackageForTest(draft);
    try {
      await fx.activateWorkPackageForTest(draft);
      assert.fail("Expected second activation to fail");
    } catch (error) {
      assert.instanceOf(error, Error);
    }
  });

  it("Finance activation enforces complete milestone schedules before activation", async () => {
    const { fx, projectDrafter } = await setupDraftFixture();
    const draft = await fx.createPackageDraftForTest(
      806,
      fx.pm,
      projectDrafter,
      fx.contractor.publicKey,
      new anchor.BN(300_000)
    );

    await fx.createDraftMilestoneForTest(
      draft,
      1,
      new anchor.BN(100_000),
      new anchor.BN(1_700_000_000),
      new anchor.BN(1_700_086_400),
      fx.pm,
      projectDrafter
    );
    await expectError(fx.activateWorkPackageForTest(draft), "InvalidStatus");

    await fx.createDraftMilestoneForTest(
      draft,
      2,
      new anchor.BN(200_000),
      new anchor.BN(1_700_086_401),
      new anchor.BN(1_700_172_800),
      fx.pm,
      projectDrafter
    );
    await fx.activateWorkPackageForTest(draft);

    const workPackage = await fx.program.account.workPackageAccount.fetch(
      draft.workPackage
    );
    assert.deepStrictEqual(workPackage.status, { active: {} });
    assert.strictEqual(
      workPackage.allocatedMilestoneAmount.toNumber(),
      300_000
    );
    assert.strictEqual(workPackage.milestoneCounter.toNumber(), 2);
  });
});
