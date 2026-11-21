import assert from "node:assert/strict";
import { test } from "node:test";
import { tournamentJourney } from "../src/lib/tournamentJourney.ts";

const deposit = ["anchor", "escrow", "bind", "fund"];
const approved = [
  ...deposit,
  "freeze",
  "declare",
  "mark",
  "approve_tw",
  "approve",
];
const base = {
  roles: [],
  joined: false,
  winner: false,
  canFreeze: false,
  confirmed: ["anchor"],
  claimAt: null,
  now: 0,
};

test("new players see signup, and organizers see the action for their current stage", () => {
  assert.deepEqual(tournamentJourney(base).actions, ["join"]);
  assert.deepEqual(tournamentJourney({ ...base, joined: true }).actions, []);
  assert.deepEqual(
    tournamentJourney({
      ...base,
      roles: ["organizer"],
      confirmed: [],
    }).actions,
    ["anchor"],
  );
  assert.deepEqual(
    tournamentJourney({
      ...base,
      roles: ["sponsor"],
      confirmed: ["anchor", "escrow", "bind"],
    }).actions,
    ["fund", "join"],
  );
  assert.deepEqual(
    tournamentJourney({
      ...base,
      roles: ["organizer"],
      confirmed: deposit,
      joined: true,
      canFreeze: true,
    }).actions,
    ["freeze"],
  );
});

test("only the verified winning team can see claim after review and approval", () => {
  const final = {
    ...base,
    joined: true,
    winner: true,
    confirmed: approved,
    claimAt: 1_000,
  };
  assert.deepEqual(tournamentJourney(final).actions, ["dispute"]);
  assert.deepEqual(tournamentJourney({ ...final, now: 1_001 }).actions, [
    "release",
  ]);
  assert.deepEqual(
    tournamentJourney({ ...final, now: 1_001, winner: false }).actions,
    [],
  );
  assert.deepEqual(
    tournamentJourney({
      ...final,
      now: 1_001,
      confirmed: approved.filter((stage) => stage !== "approve"),
    }).actions,
    [],
  );
  const disputed = {
    ...final,
    now: 1_001,
    confirmed: [...approved, "dispute"],
  };
  assert.deepEqual(tournamentJourney(disputed).actions, []);
  assert.deepEqual(
    tournamentJourney({ ...disputed, roles: ["resolver"] }).actions,
    ["resolve"],
  );
  assert.deepEqual(
    tournamentJourney({
      ...final,
      now: 1_001,
      confirmed: [...approved, "release"],
    }).actions,
    [],
  );
});
