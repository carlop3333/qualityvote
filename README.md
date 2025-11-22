# QualityVote Reborn

This is a revival of the QualityVote bot, a bot that had the **[90-9-1 rule](https://en.wikipedia.org/wiki/1%25_rule)**: It will stick and proceed to check the votes of a comment, then if the comment drops below the vote thresholds, the post will either get removed by the bot or will notify mods. 

*But, that's what upvotes are for?* Yes, **in theory**. The issue is when the post goes to r/all or r/popular: The vast majority of users (supposed 90%) never look in comment sections (especially on r/all); thus a disconnect between casual subreddit users and invested subreddit users.

Take an example on r/blursedimages: Posts there are images that are cursed and blessed (hence blursed), but sometimes there are posts that are only cursed (or the other way), and let's say the post gets to r/all: Hence QualityVote acts as a second vote, to allow a post to be screened **"by people who care about the subreddit and aren't just voting up on every post they think is neat while scrolling."**

So TL;DR: QualityVote acts as a second vote bot following the **[90-9-1 rule](https://en.wikipedia.org/wiki/1%25_rule)**, to be tipped off about low quality posts (or remove them) and to see how community members feel about that post.

### (Almost) same settings, easy migration

Installing is as easy as a few clicks, and setting up is simple: going to your subreddit apps menu (`https://developers.reddit.com/r/[subreddit]/`), then clicking the app and there you go!

And if you're migrating, just copy/paste some of the settings into the Developer Platform settings, and that's it. **Note that you need to change some of the Placeholders!**

- `{{subreddit}}` -> `{{subreddit_name}}`
- `{{permalink}}` -> `{{link}}`

I've deleted some placeholders (mostly because some are useless, others because limitations) but if you want them back (and more) send feedback!

### The success-vote/removal-vote comments

These will be displayed after the comment passes a determinated threshold, you can do some like:

```
u/{{author}}, your post does fit the subreddit!
```

or

```
u/{{author}}, your post does **NOT** fit the subreddit!
```

### The check system

Due to devvit limitations related with schedulers, i had to set a limit on how the bot checks comments. So for example, if you set 3 hours as a post check threshold it will stop checking votes after those 3 hours. With this, a new comment option appears when there isn't sufficent votes after the check limit:

```
u/{{author}}, there weren't enough votes to determine the quality of your post...
```

This comment is customizable; and also can be disabled: at the cost of a counter appearing at the bottom, telling when the bot will stop counting votes:

```
...your message...
---
(Votes ending in X time of unit)
```

Changelog

- 0.2.1
    - Updated (part of) the codebase to Devvit 0.12.3
    - Ignore flairs now checks post flairs as well.
    - Fixed Ignore Moderators not ignoring moderators.
    - Fixed some typos (oops)...
- 0.1.3
    - Changed check system so it's easier for the end user.
    - Fixed report mode
0.1.2 - 0.1.0 -> Initial release alongside some bugfixes
