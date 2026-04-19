import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';

if (ExecutionEnvironment.canUseDOM) {
  const asciiArt = `
%c
     _                      _                       
  __| |___  __ _ _ __   ___| |__   ___  _____ _ __  
 / _\` / __|/ _\` | '_ \\ / __| '_ \\ / _ \\|_  / '__|
| (_| \\__ \\ (_| | | | | (__| | | |  __/ / /| |  _  
 \\__,_|___/\\__,_|_| |_|\\___|_| |_|\\___/___|_| (_) 
                                                    
`;

  const message = `%c
Hey curious dev! 👋 Welcome to the source!
Want to work together? Let's connect:

🔗 GitHub:   https://github.com/dsanchezcr
🔗 LinkedIn: https://linkedin.com/in/dsanchezcr
🔗 Website:  https://dsanchezcr.com/contact

Built with Docusaurus + Azure Static Web Apps 🚀
`;

  console.log(
    asciiArt,
    'color: #00bcd4; font-size: 12px; font-family: monospace; font-weight: bold;'
  );
  console.log(
    message,
    'color: #4caf50; font-size: 13px; line-height: 1.6;'
  );
}
