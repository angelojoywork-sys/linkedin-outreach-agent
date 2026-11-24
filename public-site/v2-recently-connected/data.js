// All people, companies and messages here are fictional demo data.

const ME = 'Angelo';

// Recently connected: no messages exist yet. `line` is the specific sentence
// the assistant takes from the profile, `short` is its one-line version,
// `basis` is what the draft is based on (shown to the user for review).
const NEW_PEOPLE = [
  { id: 'meera', name: 'Meera Nair', hue: 205, headline: 'Senior Product Designer at Lumen Health', when: '2 hours ago',
    basis: ['Connected today', 'Both worked at Brightside Studio', 'New role at Lumen Health'],
    line: 'I saw you just joined Lumen Health. Congrats, that sounds like a big move.', short: 'Congrats on the new job at Lumen Health.' },
  { id: 'daniel', name: 'Daniel Okafor', hue: 28, headline: 'Design Manager at Fernway', when: 'Yesterday',
    basis: ['Met at Bengaluru Design Week', 'Talk: "Critique without the bruises"'],
    line: 'I\'m still thinking about your critique talk at Bengaluru Design Week.', short: 'Your talk at Design Week stuck with me.' },
  { id: 'priya', name: 'Priya Raman', hue: 320, headline: 'UX Researcher at Kite Mobility', when: 'Yesterday',
    basis: ['Same design programme, class of 2021', 'Article on rider interviews'],
    line: 'I read your piece on what rider interviews taught you about waiting. Really liked it.', short: 'Really liked your rider interviews piece.' },
  { id: 'tomas', name: 'Tomás Alvarez', hue: 150, headline: 'Founder at Paperboat Labs', when: '2 days ago',
    basis: ['Commented on your post about motion', 'Launched Paperboat 2.0'],
    line: 'thanks for the comment on my motion post, and congrats on launching Paperboat 2.0.', short: 'Congrats on launching Paperboat 2.0.' },
  { id: 'hannah', name: 'Hannah Lindqvist', hue: 262, headline: 'Lead Product Designer at Orbit Payments', when: '2 days ago',
    basis: ['12 mutual connections', 'Promoted to Lead in September'],
    line: 'congrats on making Lead at Orbit Payments. Well deserved.', short: 'Congrats on making Lead. Well deserved.' },
  { id: 'arjun', name: 'Arjun Menon', hue: 88, headline: 'Frontend Engineer at Stackline', when: '3 days ago',
    basis: ['Hackathon teammate, 2024', 'Maintains the Glide animation library'],
    line: 'I\'ve been following Glide since you open-sourced it. It keeps getting better.', short: 'Glide keeps getting better.' },
  { id: 'sofia', name: 'Sofia Brandt', hue: 350, headline: 'Brand Designer at Northfield', when: '3 days ago',
    basis: ['8 mutual connections', 'Recent Northfield brand refresh'],
    line: 'the Northfield refresh you worked on looks great. Love what you did with it.', short: 'Love the Northfield refresh you worked on.' },
  { id: 'kwame', name: 'Kwame Mensah', hue: 40, headline: 'Product Manager at Ledgerly', when: '4 days ago',
    basis: ['Connected after your post on onboarding', 'Ledgerly focuses on small-business finance'],
    line: 'I saw you\'re building small-business finance tools at Ledgerly. Sounds like a hard problem.', short: 'Ledgerly sounds like a hard, good problem.' },
  { id: 'yuki', name: 'Yuki Tanaka', hue: 180, headline: 'Motion Designer at Cobalt Studio', when: '5 days ago',
    basis: ['Follows you', 'Motion reel on their profile'],
    line: 'your motion reel is the kind of work I\'d love to learn from.', short: 'Your motion reel is excellent.' },
  { id: 'isabel', name: 'Isabel Duarte', hue: 120, headline: 'Talent Partner at Halden', when: '6 days ago',
    basis: ['4 mutual connections', 'Halden is hiring designers this quarter'],
    line: 'I saw Halden is hiring designers this quarter. Sounds like a good place to be.', short: 'Halden looks like a great place.' },
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
  base:   { label: 'Intro',       said: '',                      greet: f => `Hi ${f},`,                         close: '', sign: ME,
            match: /intro|original|reset|undo|start over|revert/i },
  short:  { label: 'Shorter',     said: 'Made it shorter.',      greet: f => `Hi ${f}, great to connect.`,              close: '', sign: ME, useShort: true,
            match: /short|brief|concise|trim|cut/i },
  warm:   { label: 'Warmer',      said: 'Made it warmer.',       greet: f => `Hi ${f}, so glad we connected.`,   close: 'Would love to hear what you are working on.', sign: `Thanks,\n${ME}`,
            match: /warm|friendl|casual|soft|kind/i },
  formal: { label: 'More formal', said: 'Made it more formal.',  greet: f => `Hello ${f}, thank you for connecting.`,   close: 'I look forward to staying in touch.', sign: `Best regards,\n${ME}`,
            match: /formal|professional|polish/i },
};

const EXTRAS = {
  ask:       { label: 'Ask for a chat',  said: 'Added a request for a quick chat.',
               text: 'Any chance of a quick chat in the next couple of weeks?', match: /chat|call|coffee|catch up|talk|meet/i },
  portfolio: { label: 'Share portfolio', said: 'Added a note about your portfolio.',
               text: 'I just rebuilt my portfolio. Would love your honest take.', match: /portfolio|feedback|opinion|work to you/i },
  roles:     { label: 'Ask about roles', said: 'Added a question about roles.',
               text: 'I\'m looking at product design roles. Could I ask about your team?', match: /role|job|hiring|opening|position/i },
};

function buildDraft(p, d) {
  const t = TONES[d.tone], f = p.name.split(' ')[0];
  const cap = x => x[0].toUpperCase() + x.slice(1), hook = t.useShort ? p.short : p.line;
  const first = `${t.greet(f)} ${t.greet(f).endsWith(',') ? hook : cap(hook)}`;
  const second = d.extra ? EXTRAS[d.extra].text : t.close;
  return [first, second, t.sign].filter(Boolean).join('\n\n');
}
