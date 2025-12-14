// Test script untuk 3 endpoint baru
import fs from 'fs';

const baseURL = 'http://localhost:3000';

// Test file content
const testContent = `
Ini adalah contoh transcript untuk testing.
Meeting dimulai pada pukul 10:00 dengan agenda:
1. Review project progress
2. Diskusi budget
3. Planning next sprint

Tim yang hadir:
- John sebagai Project Manager
- Sarah sebagai Developer
- Mike sebagai Designer

Diskusi berjalan lancar dan semua target tercapai.
Meeting selesai pada pukil 11:30.
`;

async function testSummaries() {
  console.log('\n🧪 Testing /summaries endpoint...');
  
  try {
    const formData = new FormData();
    const blob = new Blob([testContent], { type: 'text/plain' });
    formData.append('file', blob, 'test.txt');

    const response = await fetch(`${baseURL}/summaries`, {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    console.log('✅ Summaries response:', result);
  } catch (error) {
    console.log('❌ Summaries error:', error.message);
  }
}

async function testSummariesChunk() {
  console.log('\n🧪 Testing /summaries-chunk endpoint...');
  
  try {
    const formData = new FormData();
    const blob = new Blob([testContent], { type: 'text/plain' });
    formData.append('file', blob, 'test.txt');

    const response = await fetch(`${baseURL}/summaries-chunk`, {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    console.log('✅ Summaries-chunk response:', result);
  } catch (error) {
    console.log('❌ Summaries-chunk error:', error.message);
  }
}

async function testRAG() {
  console.log('\n🧪 Testing /rag endpoint...');
  
  try {
    const response = await fetch(`${baseURL}/rag`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Siapa saja yang hadir dalam meeting?'
      })
    });

    const result = await response.json();
    console.log('✅ RAG response:', result);
  } catch (error) {
    console.log('❌ RAG error:', error.message);
  }
}

// Run all tests
async function runTests() {
  console.log('🚀 Memulai test endpoint...\n');
  
  await testSummaries();
  await testSummariesChunk();
  await testRAG();
  
  console.log('\n✅ Semua test selesai!');
}

runTests().catch(console.error);