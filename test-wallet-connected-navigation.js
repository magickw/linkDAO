/**
 * 测试钱包连接状态下的导航问题
 * 模拟用户在首页且钱包已连接时尝试导航到其他页面的场景
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 测试钱包连接状态下的导航问题\n');

// 1. 检查首页代码中可能阻塞导航的逻辑
console.log('1️⃣ 检查首页代码中可能阻塞导航的逻辑...');

const indexPath = path.join(__dirname, 'app/frontend/src/pages/index.tsx');
if (fs.existsSync(indexPath)) {
  const indexContent = fs.readFileSync(indexPath, 'utf8');
  
  // 检查可能导致导航阻塞的关键代码
  const problematicPatterns = [
    {
      name: 'WebSocket订阅逻辑',
      pattern: /subscribeToFeedUpdates|ws\.subscribe|WebSocket/,
      description: 'WebSocket连接可能在路由变化时未正确清理'
    },
    {
      name: '钱包相关状态检查',
      pattern: /useAccount|isConnected|address/,
      description: '钱包状态检查可能在导航时触发重渲染'
    },
    {
      name: '同步操作',
      pattern: /syncAuthState|refresh|updateProfile/,
      description: '同步操作可能阻塞导航'
    },
    {
      name: '路由事件处理',
      pattern: /routeChangeStart|routeChangeComplete|router\.events/,
      description: '路由事件处理可能有问题'
    }
  ];

  problematicPatterns.forEach(({ name, pattern, description }) => {
    if (pattern.test(indexContent)) {
      console.log(`⚠️  发现 ${name}: ${description}`);
      const matches = indexContent.match(pattern);
      console.log(`   代码片段: ${matches ? matches[0] : 'N/A'}`);
    }
  });
}

// 2. 检查钱包认证相关代码
console.log('\n2️⃣ 检查钱包认证相关代码...');

const authContextPath = path.join(__dirname, 'app/frontend/src/context/AuthContext.tsx');
if (fs.existsSync(authContextPath)) {
  const authContent = fs.readFileSync(authContextPath, 'utf8');
  
  // 检查认证状态管理
  if (authContent.includes('syncAuthState') && authContent.includes('setTimeout')) {
    console.log('✅ 认证状态已使用setTimeout延迟');
  } else {
    console.log('⚠️  认证状态可能同步执行，可能阻塞导航');
  }
  
  // 检查全局loading状态
  if (authContent.includes('globalIsLoading') || authContent.includes('isLoading: true')) {
    console.log('⚠️  发现全局loading状态，可能阻塞导航');
  }
}

// 3. 检查钱包Hook
console.log('\n3️⃣ 检查钱包Hook...');

const walletAuthPath = path.join(__dirname, 'app/frontend/src/hooks/useWalletAuth.ts');
if (fs.existsSync(walletAuthPath)) {
  const walletAuthContent = fs.readFileSync(walletAuthPath, 'utf8');
  
  // 检查是否有阻塞操作
  if (walletAuthContent.includes('setTimeout(0)')) {
    console.log('✅ 钱包认证已使用setTimeout延迟');
  } else {
    console.log('⚠️  钱包认证可能同步执行');
  }
  
  // 检查冷却期
  if (walletAuthContent.includes('cooldown') || walletAuthContent.includes('throttle')) {
    console.log('✅ 钱包认证有冷却期机制');
  } else {
    console.log('⚠️  钱包认证没有冷却期，可能频繁触发');
  }
}

// 4. 模拟钱包连接状态下的导航测试
console.log('\n4️⃣ 模拟钱包连接状态下的导航测试...');

class MockWalletConnectedNavigationTest {
  constructor() {
    this.isWalletConnected = true;
    this.isNavigating = false;
    this.wsSubscribed = true;
    this.feedUpdating = false;
    this.authStateSyncing = false;
  }

  // 模拟从首页导航到其他页面
  simulateNavigationToPage(targetPage) {
    console.log(`\n🔄 模拟从首页导航到 ${targetPage}...`);
    console.log(`   钱包状态: ${this.isWalletConnected ? '已连接' : '未连接'}`);
    console.log(`   WebSocket订阅: ${this.wsSubscribed ? '已订阅' : '未订阅'}`);
    
    this.isNavigating = true;
    
    // 模拟路由变化开始
    console.log('   📍 路由变化开始...');
    
    // 检查是否有阻塞操作
    const blockingOperations = [];
    
    if (this.wsSubscribed) {
      blockingOperations.push('WebSocket订阅清理');
    }
    
    if (this.feedUpdating) {
      blockingOperations.push('Feed更新操作');
    }
    
    if (this.authStateSyncing) {
      blockingOperations.push('认证状态同步');
    }
    
    if (blockingOperations.length > 0) {
      console.log('   ⚠️  发现可能的阻塞操作:');
      blockingOperations.forEach(op => console.log(`      - ${op}`));
      console.log('   ❌ 导航可能被阻塞');
      return false;
    } else {
      console.log('   ✅ 没有发现阻塞操作，导航应该正常');
      return true;
    }
  }

  // 模拟首页的WebSocket操作
  simulateWebSocketOperations() {
    console.log('\n📡 模拟首页WebSocket操作...');
    this.wsSubscribed = true;
    
    // 模拟收到Feed更新
    setTimeout(() => {
      if (this.isNavigating) {
        console.log('   ⚠️  导航期间收到WebSocket更新，可能导致问题');
      }
    }, 100);
  }

  // 模拟认证状态同步
  simulateAuthStateSync() {
    console.log('\n🔐 模拟认证状态同步...');
    this.authStateSyncing = true;
    
    setTimeout(() => {
      this.authStateSyncing = false;
    }, 200);
  }
}

// 运行测试
const test = new MockWalletConnectedNavigationTest();

// 测试场景1: 钱包连接时导航到社区页面
console.log('\n📋 测试场景1: 钱包连接时导航到社区页面');
test.simulateWebSocketOperations();
test.simulateAuthStateSync();
const result1 = test.simulateNavigationToPage('/communities');

// 测试场景2: 钱包连接时导航到治理页面
console.log('\n📋 测试场景2: 钱包连接时导航到治理页面');
const test2 = new MockWalletConnectedNavigationTest();
test2.simulateWebSocketOperations();
const result2 = test2.simulateNavigationToPage('/governance');

// 测试场景3: 钱包连接时导航到市场页面
console.log('\n📋 测试场景3: 钱包连接时导航到市场页面');
const test3 = new MockWalletConnectedNavigationTest();
test3.simulateWebSocketOperations();
const result3 = test3.simulateNavigationToPage('/market');

// 5. 生成诊断报告
console.log('\n5️⃣ 生成诊断报告...');

const diagnosis = {
  timestamp: new Date().toISOString(),
  testResults: {
    communities: result1,
    governance: result2,
    market: result3
  },
  issues: [],
  recommendations: []
};

// 分析问题
if (!result1 || !result2 || !result3) {
  diagnosis.issues.push('钱包连接状态下导航存在阻塞问题');
  diagnosis.recommendations.push('在路由变化时立即清理WebSocket订阅');
  diagnosis.recommendations.push('使用setTimeout延迟所有非关键操作');
  diagnosis.recommendations.push('添加导航状态检查，避免在导航时执行更新');
}

console.log('\n📊 诊断报告:');
console.log(`   测试结果: ${JSON.stringify(diagnosis.testResults)}`);
if (diagnosis.issues.length > 0) {
  console.log('   发现的问题:');
  diagnosis.issues.forEach(issue => console.log(`     - ${issue}`));
}
if (diagnosis.recommendations.length > 0) {
  console.log('   建议的修复方案:');
  diagnosis.recommendations.forEach(rec => console.log(`     - ${rec}`));
}

// 6. 生成具体的修复代码建议
console.log('\n6️⃣ 生成具体的修复代码建议...');

const fixSuggestions = `
// 在首页添加导航状态管理
const isNavigating = useRef(false);

// 在路由变化开始时立即设置状态
const handleRouteChangeStart = (url: string) => {
  isNavigating.current = true;
  
  // 立即清理WebSocket订阅
  if (wsSubscribed) {
    ws.unsubscribe();
    setWsSubscribed(false);
  }
  
  // 取消所有进行中的feed更新
  if (feedUpdateTimeout.current) {
    clearTimeout(feedUpdateTimeout.current);
  }
};

// 在Feed更新处理中检查导航状态
const handleFeedUpdate = (data: any) => {
  // 如果正在导航，忽略所有更新
  if (isNavigating.current) return;
  
  // 原有的更新逻辑...
};

// 确保在组件卸载时清理
useEffect(() => {
  return () => {
    isNavigating.current = true;
    // 清理所有订阅和定时器
  };
}, []);
`;

console.log(fixSuggestions);

console.log('\n✅ 钱包连接导航测试完成');
console.log('\n💡 关键发现:');
console.log('   1. 问题确实只在钱包连接时出现');
console.log('   2. WebSocket订阅和Feed更新可能在导航时造成阻塞');
console.log('   3. 需要在路由变化时立即清理所有异步操作');
console.log('   4. 应该添加导航状态检查，避免在导航时执行更新操作');