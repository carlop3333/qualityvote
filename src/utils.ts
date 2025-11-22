import { PostSubmit } from "@devvit/protos";
import { LinkFlairV2, UserFlairV2 } from "@devvit/protos/types/devvit/reddit/v2alpha/flair.js";
import { RedditAPIClient } from "@devvit/public-api";

/**
 * 
 * @param flairArray An array of flairs as strings to check.
 * @param userFlair The user flair to check as a string.
 * @param postFlair The post flair to check as a string. 
 * @returns A boolean indicating whether the user/post has a flair.
 */
export function checkFlairs(flairArray: Array<string>, userFlair: UserFlairV2 | undefined, postFlair: LinkFlairV2 | undefined) {
	console.debug(flairArray);
	console.debug(userFlair);
	console.debug(postFlair);
	//thinking about this being intended behavior
	//most ignored user flairs should be mod-only anyways
	if (userFlair && flairArray.includes(userFlair.text)) return true
	else if (postFlair && flairArray.includes(postFlair.text)) return true;
	console.debug("[Flair] User/post doesn't have a flair");
	return false;
}

export function getTimer(threshold: number, unit: string) {
	const time = new Date();
	//* there are better ways for this, but im lazy
	switch (unit) {
		case "min":
			time.setTime(time.getTime() + threshold * 60000);
			break;
		case "hour":
			time.setTime(time.getTime() + threshold * 3.6e6);
			break;
		case "day":
			time.setTime(time.getTime() + threshold * 8.64e7);
			break;
	}

	return time;
}

//* the "better" way
export function getNextCheckTime(totalDuration: number, unit: string, maxRetries: number): Date {
	if (maxRetries <= 0) {
		maxRetries = 1;
	}

	let totalMilliseconds: number;
	switch (unit) {
		case "min":
			totalMilliseconds = totalDuration * 60000;
			break;
		case "hour":
			totalMilliseconds = totalDuration * 3.6e6;
			break;
		default: // "day"
			totalMilliseconds = totalDuration * 8.64e7;
			break;
	}
	const intervalMilliseconds = totalMilliseconds / maxRetries;
	return new Date(Date.now() + intervalMilliseconds);
}

export function replaceCommentPlaceholders(
	paragraph: string,
	eventContext: {
		type: "PostSubmit";
	} & PostSubmit
) {
	const toReplace = {
		subreddit_name: eventContext.subreddit?.name,
		author: eventContext.author?.name,
		link: eventContext.post?.url,
	};
	let par: string = paragraph;
	for (const [key, val] of Object.entries(toReplace)) {
		par = par.replace(new RegExp(`{{${key}}}`, "g"), val ? val : "NotFoundValue");
	}
	return par;
}


/**
 ** Derived from PitchforkAssistant's Devvit Helpers 0.2.40 isModerator
 *
 * This function simplifies the process of checking if a user is a moderator of a subreddit.
 * @param reddit An instance of RedditAPIClient, such as context.reddit from inside most Devvit event handlers.
 * @param subredditName The name of the subreddit as a string, without the prefix.
 * @param username The username of the user as a string, without the prefix.
 * @returns A boolean indicating whether the user is a moderator of the subreddit.
 */
export async function isModerator(reddit: RedditAPIClient, subredditName: string, username: string): Promise<boolean> {
	return (await reddit.getModerators({ subredditName, username }).all()).length > 0;
}
/**
 ** Works the same as isModerator
 *
 * This function simplifies the process of checking if a user is approved in a subreddit.
 * @param reddit An instance of RedditAPIClient, such as context.reddit from inside most Devvit event handlers.
 * @param subredditName The name of the subreddit as a string, without the prefix.
 * @param username The username of the user as a string, without the prefix.
 * @returns A boolean indicating whether the user is approved in a subreddit.
 */
export async function isApporoved(reddit: RedditAPIClient, subredditName: string, username: string): Promise<boolean> {
	return (await reddit.getApprovedUsers({subredditName, username}).all()).length > 0;
}
