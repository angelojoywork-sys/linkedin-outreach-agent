// All people, companies and messages here are fictional demo data.
// In hooks, [[phrase|id]] marks a phrase the assistant took from profile evidence `id`.

const ME = 'Angelo';
const MAX_BATCH = 5;

const PEOPLE = [
  {
    id: 'meera', name: 'Meera Nair', hue: 205,
    headline: 'Senior Product Designer at Lumen Health',
    relation: 'Worked together at Brightside Studio',
    evidence: [
      { id: 'e1', source: 'Experience', detail: 'Started as Senior Product Designer at Lumen Health, October 2026' },
      { id: 'e2', source: 'Post, 5 days ago', detail: 'Wrote about designing handover screens for night-shift nurses' },
      { id: 'e3', source: 'Shared history', detail: 'You both worked at Brightside Studio, 2022 to 2023' },
    ],
    hook: "Congratulations on [[the new role at Lumen Health|e1]]. Your post about [[handover screens for night-shift nurses|e2]] stayed with me, and it reminded me of how you ran critiques [[back at Brightside|e3]].",
    hookShort: "Congratulations on [[the new role at Lumen Health|e1]].",
    thread: [
      { from: 'them', text: 'Last day at Brightside today. Going to miss our Friday critiques.', time: 'Mar 14' },
      { from: 'me', text: 'Same here. Keep in touch, and good luck with what comes next.', time: 'Mar 14' },
    ],
  },
  {
    id: 'daniel', name: 'Daniel Okafor', hue: 28,
    headline: 'Design Manager at Fernway',
    relation: 'Met at Bengaluru Design Week',
    evidence: [
      { id: 'e1', source: 'Post, 2 weeks ago', detail: 'Said Fernway is growing its design team this quarter' },
      { id: 'e2', source: 'Featured', detail: 'Talk: "Critique without the bruises", Bengaluru Design Week 2026' },
    ],
    hook: "I still think about your talk, [[\"Critique without the bruises\"|e2]]. I also saw that [[Fernway is growing its design team|e1]], which sounds like an exciting stretch.",
    hookShort: "I saw that [[Fernway is growing its design team|e1]].",
    thread: [
      { from: 'me', text: 'Great talk today. The part about separating the work from the person landed.', time: 'Aug 2' },
      { from: 'them', text: 'Thank you, that means a lot. Good to meet you.', time: 'Aug 2' },
    ],
  },
  {
    id: 'priya', name: 'Priya Raman', hue: 320,
    headline: 'UX Researcher at Kite Mobility',
    relation: 'Same design programme, class of 2021',
    evidence: [
      { id: 'e1', source: 'Article, last month', detail: 'Published "What 40 rider interviews taught us about waiting"' },
      { id: 'e2', source: 'Education', detail: 'Same design programme as you, class of 2021' },
    ],
    hook: "Your article on [[what 40 rider interviews taught you about waiting|e1]] was a great read. It is good to see someone [[from our class|e2]] doing research that deep.",
    hookShort: "Your article on [[the 40 rider interviews|e1]] was a great read.",
    thread: [
      { from: 'them', text: 'Are you coming to the batch reunion in December?', time: 'Oct 20' },
    ],
  },
  {
    id: 'tomas', name: 'Tomás Alvarez', hue: 150,
    headline: 'Founder at Paperboat Labs',
    relation: 'Commented on your post about motion',
    evidence: [
      { id: 'e1', source: 'Post, last week', detail: 'Announced the launch of Paperboat 2.0' },
      { id: 'e2', source: 'Activity', detail: 'Commented on your post about motion in onboarding' },
    ],
    hook: "Congratulations on [[launching Paperboat 2.0|e1]]. Thank you as well for [[your comment on my motion post|e2]], it sharpened how I think about onboarding.",
    hookShort: "Congratulations on [[launching Paperboat 2.0|e1]].",
    thread: [],
  },
  {
    id: 'hannah', name: 'Hannah Lindqvist', hue: 262,
    headline: 'Lead Product Designer at Orbit Payments',
    relation: 'Connected since 2023',
    evidence: [
      { id: 'e1', source: 'Experience', detail: 'Promoted to Lead Product Designer, September 2026' },
      { id: 'e2', source: 'Featured', detail: 'Case study: redesigning merchant onboarding at Orbit' },
    ],
    hook: "Congratulations on [[the promotion to Lead|e1]]. I read your case study on [[merchant onboarding at Orbit|e2]] twice, the before-and-after flows were so clear.",
    hookShort: "Congratulations on [[the promotion to Lead|e1]].",
    thread: [
      { from: 'me', text: 'Thanks for connecting, Hannah.', time: '2023' },
    ],
  },
  {
    id: 'arjun', name: 'Arjun Menon', hue: 88,
    headline: 'Frontend Engineer at Stackline',
    relation: 'Hackathon teammate, 2024',
    evidence: [
      { id: 'e1', source: 'Projects', detail: 'Maintains Glide, an open-source animation library' },
      { id: 'e2', source: 'Shared history', detail: 'You were on the same team at a 2024 hackathon' },
    ],
    hook: "I have been following [[Glide|e1]] since you open-sourced it, and it keeps getting better. It still makes me smile that we shipped anything at all [[at that hackathon|e2]].",
    hookShort: "I have been following [[Glide|e1]], and it keeps getting better.",
    thread: [
      { from: 'them', text: 'We actually shipped it. I need to sleep for a week.', time: '2024' },
      { from: 'me', text: 'Best team I have worked with. Thanks for carrying the build.', time: '2024' },
    ],
  },
];

const GOALS = {
  portfolio: {
    label: 'Share my new portfolio and ask for feedback',
    match: /portfolio|feedback|review|case stud/i,
    ask: {
      base: "I have just rebuilt my portfolio around a few interaction experiments, and I would really value your take on it. Would you have ten minutes to look this week?",
      shorter: "I have just rebuilt my portfolio. Could I send it over for a quick opinion?",
      warmer: "I have just rebuilt my portfolio around a few interaction experiments, and yours is an opinion I trust. If you have ten minutes this week, I would love to hear what you think.",
      formal: "I have recently rebuilt my portfolio around a set of interaction experiments, and I would value your perspective on it. Would you be open to a brief review this week?",
    },
  },
  roles: {
    label: 'Ask about open design roles on their team',
    match: /role|job|hiring|opening|position|work with/i,
    ask: {
      base: "I am exploring product design roles at the moment, and your team is one I would love to be part of. Do you know if anything is opening up, or who I should talk to?",
      shorter: "I am looking at product design roles. Is your team hiring, or is there someone I should talk to?",
      warmer: "I am exploring product design roles right now and your team keeps coming to mind. If anything is opening up, or there is someone you would point me to, I would be grateful.",
      formal: "I am currently exploring product design roles and would be glad to be considered for your team. Could you let me know whether any positions are opening, or whom I might contact?",
    },
  },
};

const TONES = {
  base:    { greet: n => `Hi ${n},`,                          sign: `Thanks,\n${ME}` },
  shorter: { greet: n => `Hi ${n},`,                          sign: ME,                       said: 'Made it shorter.',      match: /short|brief|concise|trim|cut/i },
  warmer:  { greet: n => `Hi ${n}, I hope you are doing well.`, sign: `Thanks so much,\n${ME}`, said: 'Made it warmer.',       match: /warm|friendl|casual|soft|kind/i },
  formal:  { greet: n => `Hello ${n},`,                       sign: `Best regards,\n${ME}`,   said: 'Made it more formal.',  match: /formal|professional|polish/i },
};
