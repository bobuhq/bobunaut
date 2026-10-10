export const site = { name: 'BOBU Universe', language: 'en' };

export const pages = [
  {
    slug: 'web3-gaming', title: 'Web3 Gaming in BOBU Universe',
    description: 'Explore BOBU Universe through Web3 gaming, builder identity, missions and a Mars-themed world. Learn how these experiences connect.',
    heading: 'Web3 Gaming in BOBU Universe',
    intro: 'BOBU Universe brings a space-themed game world together with builder identity, missions and exploration. This guide introduces the experience before you enter the application.',
    sections: [
      ['A universe built around participation', 'Web3 gaming connects interactive worlds with wallet-based experiences and digital identity. In BOBU Universe, the builder journey includes a passport, missions, a wallet area and a Mars environment. These are entry points for exploring the project, rather than promises of financial returns.'],
      ['Find your builder journey', 'Begin by learning about builder identity and the passport experience. From there, explore missions and the Mars world at your own pace. Individual features may require onboarding or an account inside the application.'],
      ['Understand the testing context', 'Development environments can change as features evolve. A wallet connection or an in-game balance does not by itself establish ownership of a transferable asset. Check the application’s current feature descriptions before taking part.']
    ],
    faq: [['What can I explore?', 'The project includes builder identity, a passport, missions, mining and Mars exploration areas. Availability depends on the current application state.'], ['Does Web3 gaming guarantee rewards?', 'No. Participation should be evaluated as a game experience, without assuming earnings, asset value or future token availability.']]
  },
  {
    slug: 'builder-mining', title: 'Builder Mining | BOBU Universe Guide',
    description: 'Learn about Builder Mining in BOBU Universe, how it fits the builder journey and why participation should not be treated as guaranteed income.',
    heading: 'Builder Mining in BOBU Universe',
    intro: 'Builder Mining is a named feature of the BOBU Universe builder journey. This overview explains its place alongside identity, missions and exploration without promising rewards or token value.',
    sections: [
      ['Mining as a builder experience', 'The application has a dedicated Builder Mining area. The term describes a project feature; it should not be read as a claim that your device performs proof-of-work mining or that participation creates a marketable asset.'],
      ['Connect participation with identity', 'Builder identity and the passport provide context for your journey through the universe. Explore the application’s onboarding and mining information to understand any session requirements, progress displays and available actions.'],
      ['Read the current rules', 'Session behavior and participation requirements may evolve. Use the information shown in the application to understand a session before starting it. Avoid assuming a fixed payout, conversion rate or transferable reward from a progress indicator.']
    ],
    faq: [['Is Builder Mining guaranteed income?', 'No. This guide makes no earnings claim and does not establish a cash value for any in-game progress.'], ['Where does mining fit?', 'It sits alongside the builder identity, passport and mission areas in the BOBU Universe experience.']]
  },
  {
    slug: 'solana-devnet', title: 'Solana Devnet | BOBU Universe Testing Guide',
    description: 'Understand Solana Devnet as a testing environment and learn what to check when exploring experimental wallet experiences in BOBU Universe.',
    heading: 'Understanding Solana Devnet',
    intro: 'Solana Devnet is a testing environment for development and experimentation. This guide gives context for evaluating experimental wallet experiences connected with the BOBU Universe journey.',
    sections: [
      ['A network for testing', 'Devnet is used to try application behavior without treating the experience as a production financial service. Test balances and successful experiments should not be interpreted as evidence of mainnet assets or real-world value.'],
      ['Check the network before interacting', 'When an application asks you to connect a wallet, check its displayed network and the request shown by your wallet. The presence of a wallet area in BOBU Universe does not mean every feature is on-chain or available on Devnet.'],
      ['Keep experiments in context', 'Testing can expose unfinished interactions and changing state. Record the feature and network you are using when reporting an issue. This static guide does not connect a wallet, request funds or submit a transaction.']
    ],
    faq: [['Does this page connect to Solana?', 'No. It is a static overview with no wallet connection, RPC request or transaction capability.'], ['Does Devnet progress prove mainnet ownership?', 'No. Test activity and production asset ownership are separate questions.']]
  },
  {
    slug: 'mars-exploration', title: 'Mars Exploration | BOBU Universe World Guide',
    description: 'Discover the Mars-themed side of BOBU Universe, from its world exploration area to the builder journey, missions and planetary setting.',
    heading: 'Mars Exploration in BOBU Universe',
    intro: 'Mars is a central setting in BOBU Universe. The application includes a Mars area and a dedicated world exploration view, giving builders a planetary context for their journey.',
    sections: [
      ['Explore a planetary setting', 'The Mars experience extends the project’s space theme into a world that builders can explore. Think of this page as an introduction to that setting; the interactive world lives inside the application.'],
      ['Bring your builder journey to Mars', 'Identity, a passport and missions offer other ways to understand your place in the universe. Explore these areas alongside Mars to discover how the application presents participation and progression.'],
      ['Discover the current experience', 'World views and available interactions may develop over time. Follow the application’s current onboarding and interface instructions. This guide does not promise land ownership, resource yields or access to unreleased features.']
    ],
    faq: [['Is this a real Mars mission?', 'No. Mars exploration here refers to a virtual, space-themed application experience.'], ['Can I explore the world on this page?', 'This page is an introduction. Interactive exploration is provided by the application’s Mars world view.']]
  }
];

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

export function renderPage(page, template) {
  const e = escapeHtml;
  const values = {
    language: site.language, title: e(page.title), description: e(page.description),
    heading: e(page.heading), intro: e(page.intro),
    sections: page.sections.map(([heading, body]) => `<section><h2>${e(heading)}</h2><p>${e(body)}</p></section>`).join('\n'),
    faq: page.faq.map(([question, answer]) => `<details><summary>${e(question)}</summary><p>${e(answer)}</p></details>`).join('\n'),
    related: pages.filter(other => other.slug !== page.slug).map(other => `<li><a href="../${other.slug}/index.html">${e(other.heading)}</a></li>`).join('\n')
  };
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (!(key in values)) throw new Error(`Unknown template key: ${key}`);
    return values[key];
  });
}
