import java.util.*;
import java.io.*;

class Codechef {
    static final long MOD = 1000000007;
    static int N, K;
    static List<Integer>[] adj;
    static int[] maxVisits;
    static Map<String, Long> memo;
    
    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        int T = Integer.parseInt(br.readLine().trim());
        
        while (T-- > 0) {
            String[] nk = br.readLine().trim().split("\\s+");
            N = Integer.parseInt(nk[0]);
            K = Integer.parseInt(nk[1]);
            
            // Initialize adjacency list
            adj = new ArrayList[N + 1];
            for (int i = 0; i <= N; i++) {
                adj[i] = new ArrayList<>();
            }
            
            int[] degree = new int[N + 1];
            
            // Read edges
            for (int i = 0; i < N - 1; i++) {
                String[] edge = br.readLine().trim().split("\\s+");
                int u = Integer.parseInt(edge[0]);
                int v = Integer.parseInt(edge[1]);
                adj[u].add(v);
                adj[v].add(u);
                degree[u]++;
                degree[v]++;
            }
            
            // Calculate max visits
            maxVisits = new int[N + 1];
            for (int i = 1; i <= N; i++) {
                maxVisits[i] = degree[i] / 2 + 1;
            }
            
            // Solve
            memo = new HashMap<>();
            int[] visits = new int[N + 1];
            visits[1] = 1;
            
            long ans = dfs(1, 0, visits);
            System.out.println(ans);
        }
    }
    
    static long dfs(int u, int step, int[] visits) {
        // Reached K steps
        if (step == K) {
            return u == N ? 1 : 0;
        }
        
        // At N before K steps - invalid
        if (u == N) {
            return 0;
        }
        
        // Memoization key
        String key = makeKey(u, step, visits);
        if (memo.containsKey(key)) {
            return memo.get(key);
        }
        
        long ways = 0;
        
        // Try each neighbor
        for (int v : adj[u]) {
            // Can't visit N except at last step
            if (v == N && step + 1 < K) {
                continue;
            }
            
            // Check visit limit
            if (visits[v] < maxVisits[v]) {
                visits[v]++;
                ways = (ways + dfs(v, step + 1, visits)) % MOD;
                visits[v]--;
            }
        }
        
        memo.put(key, ways);
        return ways;
    }
    
    static String makeKey(int u, int step, int[] visits) {
        StringBuilder sb = new StringBuilder();
        sb.append(u).append(':').append(step);
        for (int i = 1; i <= N; i++) {
            if (visits[i] > 0) {
                sb.append(':').append(i).append('-').append(visits[i]);
            }
        }
        return sb.toString();
    }
}
