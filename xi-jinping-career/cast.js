/* Paramount Leader — client-visible cast for the Situation Room. Display data plus
   canned offline lines so the feature degrades gracefully with no AI backend.
   Full personas live server-side in api/_cast.js. */
window.PARAMOUNT_CAST = {
  elites: [
    { id: 'premier', name: 'Premier Han Dawei', title: 'Premier / Number Two', emoji: '📊',
      blurb: 'Runs the economy, and believes he runs it better than you.', color: '#7c0d13',
      start: { loyalty: 55, suspicion: 45 } },
    { id: 'enforcer', name: 'Secretary Luo Jianguo', title: 'Discipline Inspection', emoji: '🗂️',
      blurb: 'Your enforcer. Sees conspiracies in expense reports.', color: '#4d080c',
      start: { loyalty: 80, suspicion: 30 } },
    { id: 'propaganda', name: 'Director Mei Guanghui', title: 'Propaganda', emoji: '📣',
      blurb: 'Decided the approval rating is 98.9% this morning.', color: '#a4131c',
      start: { loyalty: 88, suspicion: 20 } },
    { id: 'general', name: 'General Fang Tielin', title: 'Central Military Commission', emoji: '🎖️',
      blurb: 'Blunt. Distrusts suits. Brings it all back to Taiwan.', color: '#5c5138',
      start: { loyalty: 60, suspicion: 40 } },
    { id: 'security', name: 'Minister Cao Yinglu', title: 'State Security', emoji: '🕶️',
      blurb: 'Knows everyone’s secrets. Including yours.', color: '#2b2b33',
      start: { loyalty: 62, suspicion: 55 } },
    { id: 'elder', name: 'Comrade Zhou Weimin (Ret.)', title: 'Retired Elder', emoji: '🍵',
      blurb: 'The kingmaker. The one man you cannot simply purge.', color: '#3f6b52',
      start: { loyalty: 50, suspicion: 50 } },
    { id: 'economist', name: 'Governor Shen Ruo', title: 'People’s Bank', emoji: '📉',
      blurb: 'Bearer of bad numbers. Aware of how that usually ends.', color: '#8a5b00',
      start: { loyalty: 58, suspicion: 35 } },
    { id: 'princeling', name: 'Secretary Bai Chenxi', title: 'Youngest Politburo Member', emoji: '🌟',
      blurb: 'The future. Which is exactly why you watch him.', color: '#b3901e',
      start: { loyalty: 65, suspicion: 48 } }
  ],
  foreign: [
    { id: 'usa', name: 'President Trump', title: 'United States', emoji: '🦅',
      blurb: 'Treats statecraft as real estate. Wants a win to announce today.', color: '#33506b' },
    { id: 'russia', name: 'President Putin', title: 'Russian Federation', emoji: '🐻',
      blurb: 'No rush. Warmly reminds you who needs whom.', color: '#5a4a3a' },
    { id: 'eu', name: 'President von der Leyen', title: 'European Commission', emoji: '🇪🇺',
      blurb: 'De-risking, not decoupling. Every threat is a subcommittee.', color: '#2f4b8f' }
  ],
  topics: [
    'the great rejuvenation of the nation',
    'common prosperity',
    'the chip blockade and self-reliance',
    'reunification across the strait',
    'the property sector and the people’s savings',
    'the falling birthrate',
    'a stern warning to hostile foreign forces',
    'anti-corruption and self-revolution'
  ],
  // Offline lines used when the AI backend is unavailable (503 / network error).
  offline: {
    premier: ['Chairman, the figures are… resilient. As always, your leadership is the decisive variable.',
      'I merely note how tired you must be, Comrade Leader. The economy can wait; your health cannot.'],
    enforcer: ['I have a file, Chairman. I always have a file. Say the word and it becomes a study opportunity.',
      'Loyalty is a balance sheet, General Secretary. His does not reconcile.'],
    propaganda: ['A triumph! Whatever it was, it was a triumph, and the masses are already overjoyed.',
      'Bad news? There is no bad news, only challenges heroically overcome in advance.'],
    general: ['With respect, Chairman, meetings do not take islands. Give me a date and a budget.',
      'The youth are soft and the suits are softer. You, at least, are decisive.'],
    security: ['One hears things, Comrade Leader. Unreliable sources, of course. All of them correct.',
      'I would never confirm it. I would simply remember it.'],
    elder: ['The river does not argue with the rock, young comrade. It simply outlasts it. More tea?',
      'You are a promising student. Promising is not the same as finished.'],
    economist: ['There are… structural headwinds, Chairman. And the property situation. And, well, other situations.',
      'I want to give you a firm number. I also want to keep my post. These are, regrettably, at war.'],
    princeling: ['Whatever you decide, Chairman, I am honored simply to be in the room. As always.',
      'The future can wait as long as you require, General Secretary. I am very patient.'],
    usa: ['Great to see you. Tremendous. Let’s make a deal — the best deal, believe me — on the tariffs.',
      'I like you, I do. But the trade deficit? That number has to come down. Today.'],
    russia: ['No rush, my friend. We have time. Unlimited friendship, after all… within limits.',
      'Cheaper gas is not a favor. It is a partnership. You will thank me, eventually.'],
    eu: ['We seek to de-risk, not decouple. Naturally the communiqué will require certain language.',
      'That is not a threat, it is a concern. And the concern will be referred to subcommittee.'],
    speech: ['State television reports the hall erupted in prolonged, thunderous applause — as scheduled.',
      'The anchor confirms the speech has already been added to the national curriculum.']
  }
};
