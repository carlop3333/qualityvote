import { PostSubmit } from "@devvit/protos";
import { UserFlairV2 } from "@devvit/protos/types/devvit/reddit/v2alpha/flair.js";
import { RedditAPIClient } from "@devvit/public-api";

export function checkFlairs(flairArray: Array<string>, userFlair: UserFlairV2 | undefined) {
	console.log(flairArray);
	if (userFlair) {
		if (flairArray.includes(userFlair.text)) return false;
		else return true;
	} else {
		console.log("[Flair] User doesn't have a flair");
		return true;
	}
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

//* PitchforkAssistant's Devvit Helpers 0.2.40 isModerator
/**
 * This function simplifies the process of checking if a user is a moderator of a subreddit.
 * @param reddit An instance of RedditAPIClient, such as context.reddit from inside most Devvit event handlers.
 * @param subredditName The name of the subreddit as a string, without the prefix.
 * @param username The username of the user as a string, without the prefix.
 * @returns A boolean indicating whether the user is a moderator of the subreddit.
 */
export async function isModerator(reddit: RedditAPIClient, subredditName: string, username: string): Promise<boolean> {
	const filteredModeratorList = await reddit.getModerators({ subredditName, username }).all();
	return filteredModeratorList.length > 0;
}
