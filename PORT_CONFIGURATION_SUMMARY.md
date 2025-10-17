# Port Configuration Summary

## Current Configuration
- **Frontend**: Running on http://localhost:3000
- **Backend**: Running on http://localhost:10000
- **Communication**: Frontend can successfully communicate with backend

## Services Status
✅ Frontend (Next.js) - Port 3000
✅ Backend (Express.js) - Port 10000
✅ Health Check - http://localhost:10000/health (200 OK)
✅ API Communication - Established

## Configuration Files

### Backend Configuration
The backend is configured to run on port 10000 by default in [src/index.simple.js](file:///Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/backend/src/index.simple.js):
```javascript
const PORT = process.env.PORT || 10000;
```

### Frontend Configuration
The frontend is configured to connect to the backend on port 10000 in [.env.local](file:///Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/frontend/.env.local):
```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:10000
NEXT_PUBLIC_API_URL=http://localhost:10000
BACKEND_URL=http://localhost:10000
```

## Startup Commands

### Backend
```bash
cd /Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/backend
PORT=10000 npm run simple
```

### Frontend
```bash
cd /Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/frontend
npm run dev
```

## Verification Commands

### Check Frontend
```bash
curl -I http://localhost:3000
```

### Check Backend
```bash
curl -I http://localhost:10000/health
```

## Troubleshooting

### Port Conflicts
If you encounter port conflicts:
1. Check which processes are using the ports:
   ```bash
   lsof -i :3000
   lsof -i :10000
   ```

2. Kill conflicting processes:
   ```bash
   kill -9 <PID>
   ```

3. Restart services with the commands above

### Service Communication Issues
If the frontend cannot communicate with the backend:
1. Verify both services are running
2. Check that the URLs in [.env.local](file:///Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/frontend/.env.local) match the backend port
3. Ensure CORS is properly configured in the backend
4. Check firewall settings if applicable

## Future Considerations
- Consider using environment-specific configuration files
- Implement health checks in the frontend to detect backend availability
- Add automated scripts for starting/stopping services
- Document port usage for team members