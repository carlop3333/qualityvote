import { Devvit } from "@devvit/public-api";
import { PostSubmit } from "@devvit/protos";
import * as utils from "./utils.js";
import { setting } from "./settings.js";

//global vars go here
const qualitySchedule = "qualityCheck";

//*redis is for avoiding repeating comments when there's outages
Devvit.configure({ redditAPI: true, redis: true });

//dev platform settings
Devvit.addSettings(setting);

Devvit.addSchedulerJob({
	name: qualitySchedule,
	onRun: async (event, context) => {
		console.debug(`[${new Date().getUTCDate()}] Schedule start`);
		if (event.data && "eventData" in event.data && "comment_id" in event.data) {
			//* get comment & old event context
			const comment = await context.reddit.getCommentById(event.data.comment_id as string);
			const eventCtx: { type: "PostSubmit" } & PostSubmit = JSON.parse(event.data.eventData as any);
			const subredditName = eventCtx.subreddit!.name;

			const isUnknownCommentDisabled = (await context.settings.get("disable-unknown-comment")) as boolean;

			//* get thresholds
			const threshold = (await context.settings.get("check-threshold")) as number;
			const timeUnit = ((await context.settings.get("threshold-unit")) as string[]).join();
			const time = utils.getTimer(threshold, timeUnit);
			//* vote thresholds
			const upTh = (await context.settings.get("upvote-threshold")) as number;
			const downTh = (await context.settings.get("downvote-threshold")) as number;
			//? log
			console.log(`[${subredditName} - ${new Date().getUTCDate()}] Checking quality...`);
			if (comment.score >= upTh) {
				console.log(`[${subredditName} - ${new Date().getUTCDate()}] Comment has enough upvotes!`);
				comment.edit({
					text: utils.replaceCommentPlaceholders(
						(await context.settings.get("vote-success")) as string,
						eventCtx
					),
				});
			} else if (comment.score <= downTh) {
				console.log(`[${subredditName} - ${new Date().getUTCDate()}] Comment has enough downvotes!`);
				comment.edit({
					text: utils.replaceCommentPlaceholders(
						(await context.settings.get("vote-reject")) as string,
						eventCtx
					),
				});
				try {
					const doRep = (await context.settings.get("report-post")) as boolean;
					if (doRep) {
						context.reddit.report(await context.reddit.getPostById(eventCtx.post!.id), {
							reason: "QualityVote reject",
						});
						console.log(`[${subredditName} - ${new Date().getUTCDate()}] Post ${eventCtx.post!.id} reported!`);
					} else {
						await context.reddit.remove(eventCtx.post!.id, false);
						console.log(`[${subredditName} - ${new Date().getUTCDate()}] Post ${eventCtx.post!.id} removed!`);
					}
				} catch (e) {
					console.log(`[${subredditName} - ${new Date().getUTCDate()}] Seems that the post does not exist anymore! Well... skipping!`);
					//* Delete the QV comment just in case
					(await (context.reddit.getCommentById(event.data.comment_id as string))).delete();
				}
			} else {
				const t = "tried" in event.data ? (event.data.tried as number) : 0;
				if (t <= 10) {
					console.log(
						`[${subredditName} - ${new Date().getUTCDate()}] Comment doesn't have enough votes... Retrying in the specified threshold.`
					);
					if (isUnknownCommentDisabled) {
						const votecom = utils.replaceCommentPlaceholders(
							(await context.settings.get("vote-comment")) as string,
							eventCtx
						);
						comment.edit({
							text: `${votecom}\n\n----\n\n(*Vote is ending in ${(10 - t) * threshold} ${
								timeUnit === "min" ? "minutes" : timeUnit === "hour" ? "hours" : "days"
							}*)`,
						});
					}
					context.scheduler.runJob({
						name: qualitySchedule,
						data: { comment_id: event.data.comment_id, eventData: JSON.stringify(eventCtx), tried: t + 1 },
						runAt: time,
					});
				} else {
					console.log(`[${subredditName} - ${new Date().getUTCDate()}] Comment doesn't have enough votes... Not retrying`);
					if (!isUnknownCommentDisabled) {
						comment.edit({
							text: utils.replaceCommentPlaceholders(
								(await context.settings.get("vote-unknown")) as string,
								eventCtx
							),
						});
					} else {
						const votecom = utils.replaceCommentPlaceholders(
							(await context.settings.get("vote-comment")) as string,
							eventCtx
						);
						comment.edit({
							text: `${votecom}\n\n----\n\n(*Vote has already ended*)`,
						});
					}
				}
			}
		}
	},
});

Devvit.addTrigger({
	event: "PostSubmit",
	onEvent: async (event, context) => {
		//* first get ignored flairs and isMod
		let flairsig: string | undefined = await context.settings.get("ignore-flairs");
		let modset: boolean = (await context.settings.get("ignore-moderators")) as boolean;
		//* checking mods isn't easy is it
		let isMod = await utils.isModerator(context.reddit, event.subreddit?.name!, event.author!.name);
		//placeholder if ignore-flairs settings does not exist
		if (!flairsig) flairsig = "NotARoleThatCanExist";
		if (
			event.author &&
			event.author.name !== "qualityvote2" &&
			//* check flairs
			utils.checkFlairs(flairsig.split(","), event.author.flair) &&
			(modset ? !isMod : true)
		) {
			//* get the settings
			let comment: string = (await context.settings.get("vote-comment")) as string;
			const threshold: number = (await context.settings.get("check-threshold")) as number;
			//since its known to be ["string"] its just .join
			const thresholdunit: string = ((await context.settings.get("threshold-unit")) as string[]).join();
			//* time to check
			const time = utils.getTimer(threshold, thresholdunit);

			//* replace placeholders
			comment = utils.replaceCommentPlaceholders(comment, event);

			//* try checking that there's no repeated comments
			console.log(`[${event.subreddit?.name}] ${event.author.name} created a new post! checking if there's no repeated comments`)
			if ((await context.redis.get(event.post!.id)) === "something-true") return;

			//Send to log that
			console.log(`[${event.subreddit?.name}] Sending new comment...`);
			//* send the comment
			const comm = await context.reddit.submitComment({
				text: comment,
				id: event.post!.id,
			});
			//* sticks post
			await comm.distinguish(true);
			//* set expiring key as not repeatable
			await context.redis.set(event.post!.id, "something-true", {"expiration": time});
			//* create schedule
			console.log(
				`[${event.subreddit?.name}] Comment sent with id ${comm.id}! Checking quality in ${threshold} ${thresholdunit}`
			);
			context.scheduler.runJob({
				name: qualitySchedule,
				data: { comment_id: comm.id, eventData: JSON.stringify({author: event.author, post: event.post, subreddit: event.subreddit, type: "PostSubmit"}) },
				runAt: time,
			});
		}
	},
});

export default Devvit;
