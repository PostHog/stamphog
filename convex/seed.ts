import { faker } from "@faker-js/faker";
import { v } from "convex/values";
import { internalMutation, type MutationCtx } from "./_generated/server";

const FIXTURE_PREFIX = "fixture:v1";
const FIXTURE_DAY_MS = 24 * 60 * 60 * 1000;
const FIXTURE_FAKER_SEED = 42_024;
const FIXTURE_ACTOR_COUNT = 72;
const FIXTURE_REACTIONS = ["stamp", "lgtm", "approved_stamp", "check", "done"];
const FIXTURE_CHANNELS = ["C_FIXTURE_BACKEND", "C_FIXTURE_FRONTEND"];
const FIXTURE_REQUEST_COUNT = 220;

interface FixtureActor {
  actorId: string;
  displayName: string;
  imageUrl?: string;
}

async function upsertActorProfile(
  ctx: MutationCtx,
  args: {
    actorId: string;
    displayName?: string;
    imageUrl?: string;
  }
) {
  const existing = await ctx.db
    .query("actors")
    .withIndex("by_actor_id", (q) => q.eq("actorId", args.actorId))
    .first();

  if (existing) {
    await ctx.db.patch(existing._id, {
      displayName: args.displayName ?? existing.displayName,
      imageUrl: args.imageUrl ?? existing.imageUrl,
      updatedAt: Date.now(),
    });
    return;
  }

  await ctx.db.insert("actors", {
    actorId: args.actorId,
    displayName: args.displayName ?? args.actorId,
    imageUrl: args.imageUrl,
    updatedAt: Date.now(),
  });
}

function buildFixtureActors() {
  const actors: FixtureActor[] = [];
  for (let index = 0; index < FIXTURE_ACTOR_COUNT; index++) {
    const actorNumber = (index + 1).toString().padStart(3, "0");
    actors.push({
      actorId: `fixture:actor:${actorNumber}`,
      displayName: faker.person.fullName(),
      imageUrl: faker.image.avatarGitHub(),
    });
  }
  return actors;
}

function fixtureActorAt(actors: FixtureActor[], index: number) {
  const actor = actors[index % actors.length];
  if (!actor) {
    throw new Error("missing fixture actor");
  }
  return actor;
}

function fixtureReactionAt(index: number) {
  const reaction = FIXTURE_REACTIONS[index % FIXTURE_REACTIONS.length];
  if (!reaction) {
    throw new Error("missing fixture reaction");
  }
  return reaction;
}

function fixtureChannelAt(index: number) {
  const channel = FIXTURE_CHANNELS[index % FIXTURE_CHANNELS.length];
  if (!channel) {
    throw new Error("missing fixture channel");
  }
  return channel;
}

async function loadSeedCollections(ctx: MutationCtx) {
  return Promise.all([
    ctx.db.query("requests").collect(),
    ctx.db.query("stampEvents").collect(),
    ctx.db.query("actors").collect(),
  ]);
}

async function clearAllSeedableData(ctx: MutationCtx) {
  const [requests, stampEvents, actors] = await loadSeedCollections(ctx);

  for (const request of requests) {
    await ctx.db.delete(request._id);
  }
  for (const event of stampEvents) {
    await ctx.db.delete(event._id);
  }
  for (const actor of actors) {
    await ctx.db.delete(actor._id);
  }
}

async function clearFixtureDataOnly(ctx: MutationCtx) {
  const [requests, stampEvents, actors] = await loadSeedCollections(ctx);

  for (const request of requests) {
    if (request.dedupeKey.startsWith(FIXTURE_PREFIX)) {
      await ctx.db.delete(request._id);
    }
  }
  for (const event of stampEvents) {
    if (
      event.dedupeKey?.startsWith(FIXTURE_PREFIX) ||
      event.source.startsWith("fixture:")
    ) {
      await ctx.db.delete(event._id);
    }
  }
  for (const actor of actors) {
    if (actor.actorId.startsWith("fixture:")) {
      await ctx.db.delete(actor._id);
    }
  }
}

async function createFixtureRequest(
  ctx: MutationCtx,
  args: {
    actors: FixtureActor[];
    requestIndex: number;
    targetRequestCount: number;
    now: number;
  }
) {
  const requester = fixtureActorAt(args.actors, args.requestIndex);
  const occurredAt =
    args.now -
    (args.targetRequestCount - args.requestIndex) * (FIXTURE_DAY_MS / 3);
  const channelId = fixtureChannelAt(args.requestIndex);
  const tsSeconds = Math.floor(occurredAt / 1000);
  const tsMicros = (args.requestIndex % 1_000_000).toString().padStart(6, "0");
  const messageRef = `${tsSeconds}.${tsMicros}`;
  const prNumber = 1200 + args.requestIndex;
  const host = args.requestIndex % 4 === 0 ? "graphite.dev" : "github.com";
  const prUrl =
    host === "github.com"
      ? `https://github.com/posthog/stamphog/pull/${prNumber}`
      : `https://app.graphite.dev/github/pr/posthog/stamphog/${prNumber}`;

  await ctx.db.insert("requests", {
    requesterId: requester.actorId,
    channelId,
    messageRef,
    occurredAt,
    prUrl,
    dedupeKey: `${FIXTURE_PREFIX}:request:${args.requestIndex}`,
  });

  return { requester, occurredAt, channelId, prUrl };
}

async function createFixtureStampEvents(
  ctx: MutationCtx,
  args: {
    actors: FixtureActor[];
    requestIndex: number;
    requesterId: string;
    occurredAt: number;
    channelId: string;
    prUrl: string;
  }
) {
  if (args.requestIndex % 7 === 0) {
    return 0;
  }

  let createdEvents = 0;
  const stampsForRequest = (args.requestIndex % 5) + 1;
  for (let stampIndex = 0; stampIndex < stampsForRequest; stampIndex++) {
    let giver = fixtureActorAt(args.actors, args.requestIndex + stampIndex + 2);
    if (giver.actorId === args.requesterId) {
      giver = fixtureActorAt(args.actors, args.requestIndex + stampIndex + 3);
    }
    const reaction = fixtureReactionAt(args.requestIndex + stampIndex);

    await ctx.db.insert("stampEvents", {
      giverId: giver.actorId,
      requesterId: args.requesterId,
      stampCount: 1,
      occurredAt: args.occurredAt + stampIndex * 60_000,
      source: `fixture:${reaction}`,
      channelId: args.channelId,
      prUrl: args.prUrl,
      dedupeKey: `${FIXTURE_PREFIX}:stamp:${args.requestIndex}:${stampIndex}`,
    });
    createdEvents += 1;
  }

  return createdEvents;
}

export const seedTestData = internalMutation({
  args: {
    resetExistingData: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const targetRequestCount = FIXTURE_REQUEST_COUNT;
    const now = Date.now();
    faker.seed(FIXTURE_FAKER_SEED);
    const fixtureActors = buildFixtureActors();

    if (args.resetExistingData) {
      await clearAllSeedableData(ctx);
    } else {
      await clearFixtureDataOnly(ctx);
    }

    for (const actor of fixtureActors) {
      await upsertActorProfile(ctx, actor);
    }

    let createdRequests = 0;
    let createdEvents = 0;

    for (
      let requestIndex = 0;
      requestIndex < targetRequestCount;
      requestIndex++
    ) {
      const request = await createFixtureRequest(ctx, {
        actors: fixtureActors,
        requestIndex,
        targetRequestCount,
        now,
      });
      createdRequests += 1;

      createdEvents += await createFixtureStampEvents(ctx, {
        actors: fixtureActors,
        requestIndex,
        requesterId: request.requester.actorId,
        occurredAt: request.occurredAt,
        channelId: request.channelId,
        prUrl: request.prUrl,
      });
    }

    return {
      fixtureVersion: FIXTURE_PREFIX,
      resetExistingData: args.resetExistingData ?? false,
      createdActors: fixtureActors.length,
      createdRequests,
      createdStampEvents: createdEvents,
    };
  },
});
