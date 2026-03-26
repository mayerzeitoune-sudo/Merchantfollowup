"""
Pre-built drip campaign templates for Merchant Follow Up
New Lead campaign + 3 Funded Deal campaigns (Short/Medium/Long term)
"""

NEW_LEAD_TEMPLATES = {
    "name": "New Lead Follow-Up",
    "description": "30-day daily cycle, then every-other-day, weekly, and monthly follow-ups for new leads",
    "campaign_type": "new_lead",
    "target_tag": "New Lead",
    "steps": []
}

# Daily cycle - Days 1-30
_daily_msgs = [
    "{first_name}, you asked for ${amount_requested}. What does the business do monthly in revenue on average?",
    "{first_name}, hard for me to help if you disappear after asking for money. What's monthly revenue?",
    "{first_name}, if you're serious about the ${amount_requested}, I need average monthly revenue.",
    "{first_name}, I'm not guessing numbers for you. What does the business average monthly?",
    "{first_name}, are you actually still looking for funding or just shopping around?",
    "{first_name}, you reached out for capital. I replied. Don't go cold on me now — what's monthly revenue?",
    "{first_name}, simple question: what does the business do monthly?",
    "{first_name}, if the business has the revenue, I can work with it. If not, I'll tell you that too. What's the number?",
    "{first_name}, I still have your request open, but I'm not chasing this forever. Monthly revenue?",
    "{first_name}, I can move fast, but only if you answer the one thing I asked. What's average monthly revenue?",
    "{first_name}, don't ask for ${amount_requested} and then vanish. What does the business bring in monthly?",
    "{first_name}, I'm trying to size this correctly. Monthly revenue?",
    "{first_name}, send a rough range if you don't know exacts:\nunder 50k / 50k–100k / 100k+",
    "{first_name}, I'm following up again because deals die when merchants stop responding. What's monthly revenue?",
    "{first_name}, should I keep this active or move on?",
    "{first_name}, I don't mind helping, but I need something back from you. What's the monthly revenue?",
    "{first_name}, if timing changed, say that. If not, answer the revenue question.",
    "{first_name}, still trying to help you get this done. Monthly revenue?",
    "{first_name}, you wanted funding. I'm trying to get you there. What does the business average monthly?",
    "{first_name}, I'm not here to waste your time or mine. Is this still real?",
    "{first_name}, I can't tell if this is a real file or not until you answer. Monthly revenue?",
    "{first_name}, if you still need the money, act like it. What's average monthly revenue?",
    "{first_name}, I've followed up enough times to know whether this is serious. Where are we at?",
    "{first_name}, if this is still active, reply with monthly revenue and let's keep it moving.",
    "{first_name}, you asked for ${amount_requested}. I'm still waiting on the most basic number.",
    "{first_name}, should I close this out and stop reaching out?",
    "{first_name}, if the deal matters, answer. If not, I'll move on.",
    "{first_name}, I'm giving this one more push before I drop it. Monthly revenue?",
    "{first_name}, a quick reply keeps this alive. No reply tells me to kill it.",
    "{first_name}, final daily follow-up. If you still want the ${amount_requested}, send monthly revenue. Otherwise I'm closing the file.",
]

# Every other day cycle - 10 messages
_eod_msgs = [
    "{first_name}, I'm checking in again because you asked for funding and then went quiet. Monthly revenue?",
    "{first_name}, I can reopen this instantly if you send the revenue number.",
    "{first_name}, if this is still a priority, answer the question and let's move.",
    "{first_name}, I'm not going to babysit this file forever. Is this still active?",
    "{first_name}, if the need for capital is real, send monthly revenue.",
    "{first_name}, should I keep working this or close it?",
    "{first_name}, not trying to chase you — trying to get you funded. What's monthly revenue?",
    "{first_name}, the longer this sits, the colder it gets. Still want help?",
    "{first_name}, I'm still here, but I need you to meet me halfway. Monthly revenue?",
    "{first_name}, I'll assume this is dead if I don't hear back.",
]

# Weekly cycle - 8 messages
_weekly_msgs = [
    "{first_name}, circling back on your funding request. Still looking?",
    "{first_name}, if capital is still needed, reply with monthly revenue and I'll pick this back up.",
    "{first_name}, I'm surprised I never heard back after you asked for funding. Still interested?",
    "{first_name}, deals don't get done in silence. If this is still active, reply.",
    "{first_name}, should I assume this got handled elsewhere?",
    "{first_name}, still open to helping if the need is still there.",
    "{first_name}, one reply gets this moving again. Monthly revenue?",
    "{first_name}, checking in before I bury this file for good.",
]

# Monthly cycle - 6 messages
_monthly_msgs = [
    "{first_name}, touching base in case funding is back on the table.",
    "{first_name}, last time we spoke you were looking for capital. Still a need?",
    "{first_name}, if the business still needs working capital, reply here.",
    "{first_name}, just checking whether timing is better now than before.",
    "{first_name}, I'll keep this simple — still looking for funds or no?",
    "{first_name}, reaching out one last time before I fully close this out.",
]

# Build the steps with proper day offsets
_day = 0
for i, msg in enumerate(_daily_msgs):
    _day += 1
    NEW_LEAD_TEMPLATES["steps"].append({
        "day": _day,
        "phase": "daily",
        "message": msg,
        "label": f"Day {_day}"
    })

for i, msg in enumerate(_eod_msgs):
    _day += 2  # Every other day
    NEW_LEAD_TEMPLATES["steps"].append({
        "day": _day,
        "phase": "every_other_day",
        "message": msg,
        "label": f"EOD {i+1} (Day {_day})"
    })

for i, msg in enumerate(_weekly_msgs):
    _day += 7  # Weekly
    NEW_LEAD_TEMPLATES["steps"].append({
        "day": _day,
        "phase": "weekly",
        "message": msg,
        "label": f"Week {i+1} (Day {_day})"
    })

for i, msg in enumerate(_monthly_msgs):
    _day += 30  # Monthly
    NEW_LEAD_TEMPLATES["steps"].append({
        "day": _day,
        "phase": "monthly",
        "message": msg,
        "label": f"Month {i+1} (Day {_day})"
    })


# ============== FUNDED DEAL CAMPAIGNS ==============

SHORT_TERM_TEMPLATES = {
    "name": "Funded Deal - Short Term (8-12 weeks)",
    "description": "Weekly check-ins for short-term funded deals, transitioning to renewal conversations",
    "campaign_type": "funded_short",
    "target_tag": "Funded",
    "steps": []
}

_short_msgs = [
    "Good morning, {first_name}. Just checking in — how have the funds been working for {company_name} so far? Everything smooth on your end?",
    "Hey {first_name}, wanted to check in and make sure everything is going well with the funding. Are the payments feeling manageable so far?",
    "Morning {first_name}, just touching base. How are the funds working for {company_name}? Any issues or requests on your end?",
    "Hey {first_name}, hope all is well. Just wanted to see how things are going with the deal and whether the capital has been helping.",
    "Good morning, {first_name}. You're now a few weeks in, so I wanted to check whether the current amount has been enough or if you may need additional working capital soon.",
    "Hey {first_name}, just checking in. If business is moving the way you expected, we may be able to look at adding more capital soon. Want to discuss?",
    "Morning {first_name}, based on how things have been going, I wanted to see whether you may want to explore additional funding for {company_name}.",
    "Hey {first_name}, if you're looking to keep momentum going, this is usually around the time merchants start discussing their next round. Let me know if you want me to work numbers.",
    "Good morning, {first_name}. If more capital would help with growth, inventory, payroll, or opportunity purchases, I can start preparing options for you.",
    "Hey {first_name}, just reaching out because if you think you'll want more funding, it's best to start the conversation before the current deal is finished.",
    "Morning {first_name}, wanted to stay ahead of the curve — do you see {company_name} needing additional capital after this round?",
    "Hey {first_name}, you're nearing the end of this term. If you want to roll into a new position or increase funding, I can help line that up.",
]

for i, msg in enumerate(_short_msgs):
    SHORT_TERM_TEMPLATES["steps"].append({
        "day": (i + 1) * 7,  # Weekly on Mondays
        "phase": "weekly",
        "message": msg,
        "label": f"Week {i+1} (Day {(i+1)*7})"
    })


MEDIUM_TERM_TEMPLATES = {
    "name": "Funded Deal - Medium Term (12-24 weeks)",
    "description": "Weekly relationship-building for medium-term deals, transitioning to expansion/renewal",
    "campaign_type": "funded_medium",
    "target_tag": "Funded",
    "steps": []
}

_medium_msgs = [
    "Good morning, {first_name}. Just checking in to make sure everything went smoothly after funding. How have the funds been working for {company_name}?",
    "Hey {first_name}, wanted to touch base and see how things are going so far. Are the payments feeling comfortable?",
    "Morning {first_name}, checking in to make sure the capital has been useful and everything is running smoothly on your end.",
    "Hey {first_name}, how has the funding been working for {company_name} so far? Any questions, issues, or requests?",
    "Good morning, {first_name}. Just staying in touch — is everything moving the way you expected with the deal?",
    "Hey {first_name}, wanted to see how things are going. If anything changes and you need support, I'm here.",
    "Morning {first_name}, are the payments still feeling okay? Just want to make sure the deal is working the way it should.",
    "Hey {first_name}, checking in again. Has the funding helped where you needed it most?",
    "Good morning, {first_name}. A lot of merchants start thinking ahead around this point. Do you feel the current amount was enough, or could more capital help?",
    "Hey {first_name}, just touching base. If business is growing and you think you may need more working capital, I can start looking at that with you.",
    "Morning {first_name}, I wanted to ask whether {company_name} may need another round of funding in the near future.",
    "Hey {first_name}, if you're seeing opportunities to grow, restock, hire, or take on more work, additional capital may make sense. Happy to talk through it.",
    "Good morning, {first_name}. Just checking whether you feel the current funding position is enough, or if you may want to expand it.",
    "Hey {first_name}, you've built some history now. If you think you'll want more money, I can start reviewing options.",
    "Morning {first_name}, I'd rather get ahead of it than wait until the last minute — any chance you'll want additional funding soon?",
    "Hey {first_name}, if the business could use another injection of capital, this is a good time to start the conversation.",
    "Good morning, {first_name}. Just staying proactive — do you see another funding need coming up?",
    "Hey {first_name}, wanted to see if it makes sense to look at a renewal or increase for {company_name}.",
    "Morning {first_name}, if more working capital would help keep things moving, let me know and I'll see what can be done.",
    "Hey {first_name}, you're getting closer to the later stretch of the term. If you want the next round lined up, I'm here.",
    "Good morning, {first_name}. Have you given any thought to whether {company_name} will want more funding after this deal?",
    "Hey {first_name}, wanted to keep the conversation open in case you want to discuss additional capital.",
    "Morning {first_name}, if you'd like to avoid any gap between this deal and the next opportunity, now is a good time to plan ahead.",
    "Hey {first_name}, you're nearing the end of this term. If you want to renew, increase, or structure another round, let's discuss it.",
]

for i, msg in enumerate(_medium_msgs):
    MEDIUM_TERM_TEMPLATES["steps"].append({
        "day": (i + 1) * 7,
        "phase": "weekly",
        "message": msg,
        "label": f"Week {i+1} (Day {(i+1)*7})"
    })


LONG_TERM_TEMPLATES = {
    "name": "Funded Deal - Long Term (24-52 weeks)",
    "description": "Weekly check-ins for long-term deals with gradual transition to renewal discussions",
    "campaign_type": "funded_long",
    "target_tag": "Funded",
    "steps": []
}

_long_msgs = [
    "Good morning, {first_name}. Just checking in to make sure everything has been smooth since funding. How are the funds working for {company_name}?",
    "Hey {first_name}, wanted to touch base and make sure everything is going well on your end.",
    "Morning {first_name}, are the funds helping where you needed them most?",
    "Hey {first_name}, just checking in. Any questions, issues, or requests so far?",
    "Good morning, {first_name}. Hope all is well with {company_name}. Just staying in touch.",
    "Hey {first_name}, wanted to see how things are going and whether the current setup still feels comfortable.",
    "Morning {first_name}, checking in to make sure payments are feeling alright and everything is running smoothly.",
    "Hey {first_name}, just touching base. Let me know if you need anything on my end.",
    "Good morning, {first_name}. Has the funding been helping the business the way you expected?",
    "Hey {first_name}, staying in touch here. Any requests or updates on your end?",
    "Morning {first_name}, just making sure the deal is still working comfortably for you.",
    "Hey {first_name}, wanted to check in now that you've had some time with the capital. Everything okay?",
    "Good morning, {first_name}. A lot of merchants reassess around this point. Do you feel the current amount was enough?",
    "Hey {first_name}, if the business keeps growing and you need more room, let me know.",
    "Morning {first_name}, just checking whether additional working capital would be helpful at some point this term.",
    "Hey {first_name}, staying proactive — if opportunities come up, I'd be happy to discuss more capital for {company_name}.",
    "Good morning, {first_name}. Just touching base again. How are things going on your end?",
    "Hey {first_name}, if business is moving in the right direction and you may want more capital later, I'm here to plan ahead.",
    "Morning {first_name}, have the funds done what you needed them to do so far?",
    "Hey {first_name}, wanted to stay in touch and see whether there's any upcoming need for additional capital.",
    "Good morning, {first_name}. If there's growth, expansion, or a larger opportunity ahead, feel free to reach out anytime.",
    "Hey {first_name}, just checking in. Still here if you need anything.",
    "Morning {first_name}, if you think {company_name} may want another round later on, I can help you prepare early.",
    "Hey {first_name}, you've built solid history at this point. If more capital could help, let's talk.",
    # Extended: Weeks 25-52
    "Good morning, {first_name}. Just keeping in touch — how are things going with the business?",
    "Hey {first_name}, if additional working capital would help at this stage, let me know.",
    "Morning {first_name}, wanted to see whether the current funding is still enough for what you need.",
    "Hey {first_name}, if business has picked up and you need more room, I'm here.",
    "Good morning, {first_name}. Just checking in to see how things are going on your end.",
    "Hey {first_name}, a lot of merchants revisit capital needs around this stage. Worth a conversation?",
    "Morning {first_name}, if you're planning ahead for inventory, payroll, expansion, or seasonality, I can help.",
    "Hey {first_name}, wanted to stay connected in case another funding need is coming up.",
    "Good morning, {first_name}. How has everything been going for {company_name} lately?",
    "Hey {first_name}, if more capital would help take pressure off or open new opportunities, let's discuss.",
    "Morning {first_name}, just staying proactive. Any chance you'll need additional funding soon?",
    "Hey {first_name}, if the current deal has been helpful, I'd be happy to look at what a next round could look like.",
    "Good morning, {first_name}. Just keeping the line open in case timing is right for more capital.",
    "Hey {first_name}, you've built meaningful history now. If you want to discuss another position, I'm around.",
    "Morning {first_name}, wanted to check whether the business may benefit from another injection of working capital.",
    "Hey {first_name}, if you want to line something up before the end of this term, it's a good time to start talking.",
    "Good morning, {first_name}. Happy to review options whenever you're ready.",
    "Hey {first_name}, if more funding would help keep momentum going, let me know.",
    "Morning {first_name}, wanted to touch base and see whether another round may make sense soon.",
    "Hey {first_name}, just staying ahead of the curve in case you'll want additional capital.",
    "Good morning, {first_name}. If there's anything coming up for {company_name}, I'm here to help.",
    "Hey {first_name}, if you see another need developing, I'd rather plan it early than late.",
    "Morning {first_name}, just checking whether you want to discuss future funding options.",
    "Hey {first_name}, as you get closer to the later part of this deal, I'm here if you want to line up the next move.",
    "Good morning, {first_name}. Have you given any thought to what comes after this round?",
    "Hey {first_name}, if you want to renew, increase, or review options, I can start working on that with you.",
    "Morning {first_name}, just checking in before the term wraps up further — any upcoming funding needs?",
    "Hey {first_name}, you're nearing the end of this cycle. If you want to position for additional capital, let's discuss.",
]

for i, msg in enumerate(_long_msgs):
    LONG_TERM_TEMPLATES["steps"].append({
        "day": (i + 1) * 7,
        "phase": "weekly",
        "message": msg,
        "label": f"Week {i+1} (Day {(i+1)*7})"
    })


ALL_PREBUILT_CAMPAIGNS = {
    "new_lead": NEW_LEAD_TEMPLATES,
    "funded_short": SHORT_TERM_TEMPLATES,
    "funded_medium": MEDIUM_TERM_TEMPLATES,
    "funded_long": LONG_TERM_TEMPLATES,
}
