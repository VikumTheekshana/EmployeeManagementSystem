import { connectToDatabase, disconnectDatabase } from '../src/core/database/connection';
import { encryptAES256GCM, decryptAES256GCM, maskSensitive, maskSalary } from '../src/core/security/encryption';

async function runSanityTest() {
  console.log('--- Phase 1: Security & Database Sanity Verification ---');
  
  // 1. Test AES-256-GCM Encryption / Decryption
  console.log('1. Testing AES-256-GCM Field-Level Encryption...');
  const sampleSalary = '450000.00';
  const sampleBankAcc = '80012345678901';
  const sampleNIC = '199512345678';

  const encryptedSalary = encryptAES256GCM(sampleSalary);
  const decryptedSalary = decryptAES256GCM(encryptedSalary);

  const encryptedBank = encryptAES256GCM(sampleBankAcc);
  const decryptedBank = decryptAES256GCM(encryptedBank);

  const maskedBank = maskSensitive(sampleBankAcc, 4);
  const maskedSal = maskSalary(sampleSalary);

  if (decryptedSalary !== sampleSalary || decryptedBank !== sampleBankAcc) {
    throw new Error('Encryption/Decryption mismatch failed!');
  }
  console.log('✅ AES-256-GCM FLE Encryption / Decryption PASSED!');
  console.log(`   Sample Plain Salary: ${sampleSalary} -> Encrypted: ${encryptedSalary.substring(0, 30)}... -> Decrypted: ${decryptedSalary}`);
  console.log(`   Sample Bank: ${sampleBankAcc} -> Masked: ${maskedBank} | Salary Masked: ${maskedSal}`);

  // 2. Test MongoDB Atlas Connection
  console.log('2. Testing MongoDB Atlas M0 Connection with connection pooling...');
  const conn = await connectToDatabase();
  console.log(`✅ MongoDB Atlas Connection Verified! ReadyState: ${conn.connection.readyState}`);
  
  const pingResult = await conn.connection.db?.admin().ping();
  console.log('✅ MongoDB Atlas Admin Ping Result:', pingResult);

  await disconnectDatabase();
  console.log('--- Phase 1 Sanity Verification COMPLETED SUCCESSFULLY ---');
}

runSanityTest().catch((err) => {
  console.error('❌ Phase 1 Sanity Test Failed:', err);
  process.exit(1);
});
