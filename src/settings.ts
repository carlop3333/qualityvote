import { SettingsFormField } from "@devvit/public-api";

export const setting: SettingsFormField[] = [
	{
		type: "group",
		label: "Vote Comments",
		helpText: "This is where you can configure what the bot will say at comments.",
		fields: [
			{
				type: "paragraph",
				label: "The vote comment that the bot will post. (enter spaces allowed)",
				name: "vote-comment",
				helpText: `Allowed placeholders: {{subreddit_name}} | {{author}} | {{link}}`,
				scope: "installation",
				defaultValue: `Hello u/{{author}}! Welcome to r/{{subreddit_name}}!\n\n---\n\nFor other users, does this post fit the subreddit?\n\nIf so, **upvote this comment!**\n\nOtherwise, **downvote this comment!**\n\nAnd if it does break the rules, **downvote this comment and report this post!**`,
				onValidate: ({ value }) => {
					if (value === " " || value === "" || typeof value === typeof null) {
						return "Invalid Text!";
					}
				},
			},
			{
				type: "paragraph",
				label: "The quality success comment",
				name: "vote-success",
				helpText: "The comment that will appear when the comment has passed the upvote threshold.",
				scope: "installation",
				defaultValue: `u/{{author}}, your post does fit the subreddit!`,
				onValidate: ({ value }) => {
					if (value === " " || value === "" || typeof value === typeof null) {
						return "Invalid Text!";
					}
				},
			},
			{
				type: "paragraph",
				label: "The quality reject comment",
				name: "vote-reject",
				helpText: "The comment that will appear when the comment has passed the downvote threshold.",
				scope: "installation",
				defaultValue: `u/{{author}}, your post does **NOT** fit the subreddit!`,
				onValidate: ({ value }) => {
					if (value === " " || value === "" || typeof value === typeof null) {
						return "Invalid Text!";
					}
				},
			},
			{
				type: "paragraph",
				label: "The unknown quality comment",
				name: "vote-unknown",
				helpText: "The comment that will appear when there aren't sufficient votes. (after 10 checks, read app desc)",
				scope: "installation",
				defaultValue: `u/{{author}}, there weren't enough votes to determine the quality of your post...`,
				onValidate: ({ value }) => {
					if (value === " " || value === "" || typeof value === typeof null) {
						return "Invalid Text!";
					}
				},
			}
		],
	},
	{
		type: "group",
		label: "Check thresholds",
		helpText: "Upvote and downvote thresholds, as well as time threshold.",
		fields: [
			{
				type: "number",
				label: "Post Check Threshold",
				helpText: "The time in units that a post will be checked. (min: 1 | max: 72) MUST BE MORE THAN 10 MINUTES!!!",
				name: "check-threshold",
				defaultValue: 12,
				onValidate: ({ value }) => {
					if (!value) {
						return "Threshold must not be void!";
					} else if (value < 1 || value > 72) {
						return "Threshold must be on the limit!";
					}
				},
			},
			{
				type: "select",
				label: "Time unit",
				name: "threshold-unit",
				scope: "installation",
				options: [
					{ label: "Minutes", value: "min" },
					{ label: "Hours", value: "hour" },
					{ label: "Days", value: "day" },
				],
				defaultValue: ["hour"],
				onValidate: ({ value }) => {
					if (value?.length === 0) {
						return "The time unit must be one of the selected.";
					}
				},
			},
			{
				type: "number",
				label: "Downvote threshold",
				helpText: "The number of downvotes that are needed to flag the post. (min: -1 | max: -50)",
				name: "downvote-threshold",
				scope: "installation",
				defaultValue: -5,
				onValidate: ({ value }) => {
					if (value === undefined || value === null) {
						return "Threshold must not be void!";
					} else if (value < -50 || value > 0) {
						return "Threshold must be on the limit!";
					}
				},
			},
			{
				type: "number",
				label: "Upvote threshold",
				helpText: "The number of upvotes that are needed to calm the post. (min: 1 | max: 50)",
				name: "upvote-threshold",
				scope: "installation",
				defaultValue: 5,
				onValidate: ({ value }) => {
					if (!value) {
						return "Threshold must not be void!";
					} else if (value < 1 || value > 50) {
						return "Threshold must be on the limit!";
					}
				},
			},
		],
	},
	{
		type: "group",
		label: "Miscleanous",
		helpText: "All sorts of things",
		fields: [
			{
				type: "string",
				label: "Ignore flairs",
				name: "ignore-flairs",
				scope: "installation",
				helpText: 'Comma-separated values. Eg. "My Flair 1 :cat_blep:,This is a flair,Moderator :upvote:,Random"',
			},
			{
				type: "boolean",
				label: "Ignore post flairs as well",
				name: "ignore-post-flairs",
				scope: "installation",
				helpText: 'If enabled, this will ignore post/user flairs specified above. If disabled, this will only ignore user flairs specified above.',
			},
			{
				type: "boolean",
				label: "Ignore moderators",
				name: "ignore-mods",
				scope: "installation",
				helpText: "Ignores moderators when they do posts.",
			},
			{
				type: "boolean",
				label: "Ignore approved users",
				name: "ignore-approved",
				scope: "installation",
				helpText: "Ignores approved users when they do posts.",
			},
			{
				type: "boolean",
				label: "Only report the post",
				name: "report-post",
				scope: "installation",
				helpText: "Disable this if you want the bot to remove posts when there are enough downvotes.",
			},
			{
				type: "boolean",
				label: 'Disable the "unknown comment"',
				name: "disable-unknown-comment",
				scope: "installation",
				helpText: "Disables the comment that appears when the check limit is surpassed.",
			},
		],
	},
];
