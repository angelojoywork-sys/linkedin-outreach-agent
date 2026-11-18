// All people, companies and messages here are fictional demo data.

const ME = 'Angelo';

// Recently connected: no messages exist yet. `line` is the specific sentence
// the assistant takes from the profile, `short` is its one-line version,
// `basis` is what the draft is based on (shown to the user for review).
const NEW_PEOPLE = [
  { id: 'meera', name: 'Meera Nair', hue: 205, headline: 'Senior Product Designer at Lumen Health', when: '2 hours ago',
    basis: ['Connected today', 'Both worked at Brightside Studio', 'New role at Lumen Health'],
    line: 'I saw you recently joined Lumen Health, which sounds like a great move.', short: 'Congrats on joining Lumen Health.' },
  { id: 'daniel', name: 'Daniel Okafor', hue: 28, headline: 'Design Manager at Fernway', when: 'Yesterday',
    basis: ['Met at Bengaluru Design Week', 'Talk: "Critique without the bruises"'],
    line: 'I still think about your critique talk at Bengaluru Design Week.', short: 'Loved your talk at Design Week.' },
  { id: 'priya', name: 'Priya Raman', hue: 320, headline: 'UX Researcher at Kite Mobility', when: 'Yesterday',
    basis: ['Same design programme, class of 2021', 'Article on rider interviews'],
    line: 'Your article on what the rider interviews taught you about waiting was a great read.', short: 'Your rider interviews article was great.' },
  { id: 'tomas', name: 'Tomás Alvarez', hue: 150, headline: 'Founder at Paperboat Labs', when: '2 days ago',
    basis: ['Commented on your post about motion', 'Launched Paperboat 2.0'],
    line: 'Thank you for your comment on my motion post, and congratulations on launching Paperboat 2.0.', short: 'Congrats on Paperboat 2.0.' },
  { id: 'hannah', name: 'Hannah Lindqvist', hue: 262, headline: 'Lead Product Designer at Orbit Payments', when: '2 days ago',
    basis: ['12 mutual connections', 'Promoted to Lead in September'],
    line: 'Congratulations on the move to Lead at Orbit Payments.', short: 'Congrats on the promotion to Lead.' },
  { id: 'arjun', name: 'Arjun Menon', hue: 88, headline: 'Frontend Engineer at Stackline', when: '3 days ago',
    basis: ['Hackathon teammate, 2024', 'Maintains the Glide animation library'],
    line: 'I have been following Glide since you open-sourced it, and it keeps getting better.', short: 'Glide keeps getting better.' },
  { id: 'sofia', name: 'Sofia Brandt', hue: 350, headline: 'Brand Designer at Northfield', when: '3 days ago',
    basis: ['8 mutual connections', 'Recent Northfield brand refresh'],
    line: 'The Northfield brand refresh you worked on looks fantastic.', short: 'The Northfield refresh looks great.' },
  { id: 'kwame', name: 'Kwame Mensah', hue: 40, headline: 'Product Manager at Ledgerly', when: '4 days ago',
    basis: ['Connected after your post on onboarding', 'Ledgerly focuses on small-business finance'],
    line: 'Ledgerly\'s focus on small-business finance caught my eye.', short: 'Ledgerly looks interesting.' },
  { id: 'yuki', name: 'Yuki Tanaka', hue: 180, headline: 'Motion Designer at Cobalt Studio', when: '5 days ago',
    basis: ['Follows you', 'Motion reel on their profile'],
    line: 'Your motion reel is the kind of work I would love to learn from.', short: 'Your motion reel is excellent.' },
  { id: 'isabel', name: 'Isabel Duarte', hue: 120, headline: 'Talent Partner at Halden', when: '6 days ago',
    basis: ['4 mutual connections', 'Halden is hiring designers this quarter'],
    line: 'I saw that Halden is hiring designers this quarter.', short: 'Halden looks like a great place.' },
].map(p => ({ ...p, isNew: true, thread: [] }));

// Older conversations so the inbox still looks lived in.
const OLD_PEOPLE = [
  { id: 'noor', name: 'Noor Haddad', hue: 10, headline: 'Illustrator, freelance',
    thread: [{ from: 'them', text: 'The poster files are in the shared folder now.', time: '1:52 PM' }, { from: 'me', text: 'Got them, thank you. They look great.', time: '1:55 PM' }] },
  { id: 'elliot', name: 'Elliot Park', hue: 230, headline: 'Engineering Manager at Stackline',
    thread: [{ from: 'me', text: 'Are we still on for Thursday?', time: '10:46 AM' }, { from: 'them', text: 'Yes, see you then.', time: '10:51 AM' }] },
  { id: 'grace', name: 'Grace Mwangi', hue: 300, headline: 'Art Director at Pennant',
    thread: [{ from: 'them', text: 'No worries about the delay. Send it over whenever it is ready.', time: 'Mon' }] },
].map(p => ({ ...p, isNew: false }));

const PEOPLE = [...NEW_PEOPLE, ...OLD_PEOPLE];

const TONES = {
  base:   { label: 'Intro',       said: '',                      greet: f => `Hi ${f}, pleasure to connect!`,           close: 'Looking forward to staying in touch.', sign: ME,
            match: /intro|original|reset|undo|start over|revert/i },
  short:  { label: 'Shorter',     said: 'Made it shorter.',      greet: f => `Hi ${f}, great to connect.`,              close: '', sign: ME, useShort: true,
            match: /short|brief|concise|trim|cut/i },
  warm:   { label: 'Warmer',      said: 'Made it warmer.',       greet: f => `Hi ${f}, I am really glad we connected!`, close: 'I would love to hear more about what you are working on.', sign: `Thanks so much,\n${ME}`,
            match: /warm|friendl|casual|soft|kind/i },
  formal: { label: 'More formal', said: 'Made it more formal.',  greet: f => `Hello ${f}, thank you for connecting.`,   close: 'I look forward to staying in touch.', sign: `Best regards,\n${ME}`,
            match: /formal|professional|polish/i },
};

const EXTRAS = {
  ask:       { label: 'Ask for a chat',  said: 'Added a request for a quick chat.',
               text: 'Would you be open to a quick chat in the next couple of weeks?', match: /chat|call|coffee|catch up|talk|meet/i },
  portfolio: { label: 'Share portfolio', said: 'Added a note about your portfolio.',
               text: 'I have just rebuilt my portfolio and would value your opinion on it.', match: /portfolio|feedback|opinion|work to you/i },
  roles:     { label: 'Ask about roles', said: 'Added a question about roles.',
               text: 'I am exploring product design roles and would love to hear about your team.', match: /role|job|hiring|opening|position/i },
};

function buildDraft(p, d) {
  const t = TONES[d.tone], f = p.name.split(' ')[0];
  const first = t.useShort ? `${t.greet(f)} ${p.short}` : `${t.greet(f)} ${p.line}`;
  const second = d.extra ? EXTRAS[d.extra].text : t.close;
  return [first, second, t.sign].filter(Boolean).join('\n\n');
}
