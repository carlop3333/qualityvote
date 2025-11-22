import { Devvit } from "@devvit/public-api";
import { PostSubmit } from "@devvit/protos";
import * as utils from "./utils.js";
import { setting } from "./settings.js";

//global vars go here
const qualitySchedule = "qualityCheck";
const MAX_CHECKS = 5; // total number of checks to perform

//*redis is for avoiding repeating comments when there's outages
Devvit.configure({ redditAPI: true, redis: true });

//dev platform settings
Devvit.addSettings(setting);

//uncomment me on prod (great)
console.debug = () => {};

Devvit.addSchedulerJob({
	name: qualitySchedule,
	onRun: async (event, context) => {
		console.debug(`[${new Date(Date.now()).toUTCString()}] Comment schedule start`);
		if (event.data && "eventData" in event.data && "comment_id" in event.data) {
			//* get comment & old event context
			const comment = await context.reddit.getCommentById(event.data.comment_id as string);
			const eventCtx: { type: "PostSubmit" } & PostSubmit = JSON.parse(event.data.eventData as any);
			const subredditName = eventCtx.subreddit!.name;

			const isUnknownCommentDisabled = (await context.settings.get("disable-unknown-comment")) as boolean;

			//* get thresholds
			const threshold = (await context.settings.get("check-threshold")) as number;
			const timeUnit = ((await context.settings.get("threshold-unit")) as string[]).join();

			//* vote thresholds
			const upTh = (await context.settings.get("upvote-threshold")) as number;
			const downTh = (await context.settings.get("downvote-threshold")) as number;

			//? log
			console.log(
				`[${subredditName} - ${new Date(Date.now()).toUTCString()}] Checking quality for comment ${
					event.data.comment_id
				}...`
			);
			if (comment.score >= upTh) {
				console.log(`[${subredditName} - ${new Date(Date.now()).toUTCString()}] Comment has enough upvotes!`);
				comment.edit({
					text: utils.replaceCommentPlaceholders(
						(await context.settings.get("vote-success")) as string,
						eventCtx
					),
				});
			} else if (comment.score <= downTh) {
				console.log(`[${subredditName} - ${new Date(Date.now()).toUTCString()}] Comment has enough downvotes!`);
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
						console.log(
							`[${subredditName} - ${new Date(Date.now()).toUTCString()}] Post ${
								eventCtx.post!.id
							} reported!`
						);
					} else {
						await context.reddit.remove(eventCtx.post!.id, false);
						console.log(
							`[${subredditName} - ${new Date(Date.now()).toUTCString()}] Post ${
								eventCtx.post!.id
							} removed!`
						);
					}
				} catch (e) {
					console.log(
						`[${subredditName} - ${new Date(
							Date.now()
						).toUTCString()}] Seems that the post does not exist anymore! Well... skipping!`
					);
					//* Delete the QV comment just in case
					(await context.reddit.getCommentById(event.data.comment_id as string)).delete();
				}
			} else {
				const currentCheck = "tried" in event.data ? (event.data.tried as number) : 0;
				if (currentCheck < MAX_CHECKS) {
					console.log(
						`[${subredditName} - ${new Date(
							Date.now()
						).toUTCString()}] Comment doesn't have enough votes... Check ${currentCheck} of ${MAX_CHECKS}. Rescheduling.`
					);
					if (isUnknownCommentDisabled) {
						const votecom = utils.replaceCommentPlaceholders(
							(await context.settings.get("vote-comment")) as string,
							eventCtx
						);
						const remainingChecks = MAX_CHECKS - (currentCheck + 1);
						const remainingTime = (remainingChecks * threshold) / MAX_CHECKS;

						comment.edit({
							text: `${votecom}\n\n----\n\n(*Vote is ending in approximately ${remainingTime.toFixed(
								0
							)} ${timeUnit === "min" ? "minutes" : timeUnit}*)`,
						});
					}
					context.scheduler.runJob({
						name: qualitySchedule,
						data: {
							comment_id: event.data.comment_id,
							eventData: JSON.stringify(eventCtx),
							tried: currentCheck + 1,
						},
						runAt: utils.getNextCheckTime(threshold, timeUnit, MAX_CHECKS),
					});
				} else {
					console.log(
						`[${subredditName} - ${new Date(
							Date.now()
						).toUTCString()}] Comment doesn't have enough votes after ${MAX_CHECKS} checks. Not retrying.`
					);
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
		if (!event.author || !event.subreddit) {
			console.log("Something weird happened: bot doesn't have access to subreddit/user data");
			return;
		}
		//* first get ignored flairs and isMod
		const flairs: string | undefined = await context.settings.get("ignore-flairs");
		const postFlairsSet: boolean = (await context.settings.get("ignore-post-flairs")) as boolean;
		const approvedSet: boolean = (await context.settings.get("ignore-approved")) as boolean;
		const modSet: boolean = (await context.settings.get("ignore-mods")) as boolean;
		let isMod: boolean | undefined, isApproved: boolean | undefined, hasFlair: boolean | undefined;

		//* checks
		if (modSet) isMod = await utils.isModerator(context.reddit, event.subreddit?.name!, event.author!.name);
		if (approvedSet)
			isApproved = await utils.isApporoved(context.reddit, event.subreddit?.name!, event.author!.name);
		if (flairs)
			hasFlair = utils.checkFlairs(
				flairs.split(","),
				event.author.flair,
				postFlairsSet ? event.post?.linkFlair : undefined
			);

		if (
			event.author.name !== "qualityvote2" &&
			//* event.author check -> check flairs/isMod/approved
			!(isMod || isApproved || hasFlair)
		) {
			//* get the settings
			let comment: string = (await context.settings.get("vote-comment")) as string;
			const threshold: number = (await context.settings.get("check-threshold")) as number;
			//since its known to be ["string"] its just .join
			const thresholdunit: string = ((await context.settings.get("threshold-unit")) as string[]).join();

			//* replace placeholders
			comment = utils.replaceCommentPlaceholders(comment, event);

			//* try checking that there's no repeated comments
			console.log(
				`[${event.subreddit?.name}] ${event.author.name} created a new post at ${new Date(
					Date.now()
				).toUTCString()}! checking if there's no repeated comments...`
			);
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
			await context.redis.set(event.post!.id, "something-true", {
				expiration: utils.getTimer(threshold, thresholdunit),
			});
			//* create schedule
			console.log(
				`[${event.subreddit?.name}] Comment sent with id ${comm.id}! Checking quality in ${utils
					.getTimer(threshold, thresholdunit)
					.toUTCString()}`
			);
			context.scheduler.runJob({
				name: qualitySchedule,
				data: {
					comment_id: comm.id,
					eventData: JSON.stringify({
						author: event.author,
						post: event.post,
						subreddit: event.subreddit,
						type: "PostSubmit",
					}),
					tried: 1,
				},
				runAt: utils.getNextCheckTime(threshold, thresholdunit, MAX_CHECKS),
			});
		} else {
			//log, some mods might need to share logs
			console.log(
				`[${event.subreddit?.name}] Ignored! || is a mod: ${isMod} || ignore mods enabled: ${modSet} || flairs to ignore? "${flairs}" || are post flairs ignored too? ${postFlairsSet}`
			);
		}
	},
});

export default Devvit;
