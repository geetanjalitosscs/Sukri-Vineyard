const { spawn } = require('child_process');
const os = require('os');

// Get network interfaces to show actual IP addresses
function getIPAddresses() {
  const networkInterfaces = os.networkInterfaces();
  const ipAddresses = [];

  Object.keys(networkInterfaces).forEach((interfaceName) => {
    const interfaces = networkInterfaces[interfaceName];
    if (interfaces) {
      interfaces.forEach((iface) => {
        if (iface.family === 'IPv4' && !iface.internal) {
          ipAddresses.push(iface.address);
        }
      });
    }
  });

  return ipAddresses;
}

// Get port from environment or default
const port = process.env.PORT || 3000;
const host = process.env.HOST || '0.0.0.0';

// Get IP addresses
const ipAddresses = getIPAddresses();

console.log('\n🚀 Starting Frontend Server...\n');

// Start Next.js dev server with host binding
const nextDev = spawn('npx', ['next', 'dev', '-H', host, '-p', port.toString()], {
  stdio: 'pipe',
  shell: true,
});

let readyShown = false;

// Capture Next.js output and show IPs when ready
nextDev.stdout.on('data', (data) => {
  const output = data.toString();
  process.stdout.write(output);
  
  // When Next.js shows "Ready", display IP addresses
  if (!readyShown && (output.includes('Ready') || output.includes('Local:'))) {
    readyShown = true;
    setTimeout(() => {
      console.log('\n📡 Server Access URLs:');
      console.log(`   Local: http://localhost:${port}`);
      
      if (ipAddresses.length > 0) {
        ipAddresses.forEach((ip) => {
          console.log(`   Network: http://${ip}:${port}`);
        });
      } else {
        console.log(`   Network: http://<your-ip>:${port}`);
      }
      console.log('');
    }, 500);
  }
});

nextDev.stderr.on('data', (data) => {
  process.stderr.write(data);
});

nextDev.on('close', (code) => {
  process.exit(code);
});

