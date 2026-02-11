# SecureMed - Production Deployment Checklist

## Pre-Deployment

### Environment Variables
- [ ] Set SECRET_KEY to strong random value (not default)
- [ ] Set DEBUG=False
- [ ] Set ALLOWED_HOSTS to production domains
- [ ] Set CORS_ALLOWED_ORIGINS to production frontend URL
- [ ] Set DB_PASSWORD to strong password
- [ ] Set ENCRYPTION_KEY for lab results
- [ ] Set RECAPTCHA_SECRET_KEY for production
- [ ] Set DJANGO_SECURE_SSL=True for HTTPS

### Database
- [ ] Run all migrations
- [ ] Create database backups
- [ ] Set up automated backup schedule
- [ ] Configure connection pooling
- [ ] Apply database indexes (use DB_INDEXES_MIGRATION.py)

### Security
- [ ] Enable HTTPS/SSL certificates
- [ ] Configure firewall rules
- [ ] Set up rate limiting
- [ ] Enable security headers
- [ ] Configure CORS properly
- [ ] Review and restrict admin access
- [ ] Enable MFA for admin accounts

### Performance
- [ ] Enable Redis caching
- [ ] Configure CDN for static files
- [ ] Enable gzip compression
- [ ] Optimize database queries
- [ ] Set up connection pooling

### Monitoring
- [ ] Set up error tracking (Sentry or similar)
- [ ] Configure log aggregation
- [ ] Set up uptime monitoring
- [ ] Configure alerting for critical errors
- [ ] Monitor database performance
- [ ] Track API response times

### Testing
- [ ] Run full test suite
- [ ] Perform load testing
- [ ] Test backup and restore procedures
- [ ] Verify all health check endpoints
- [ ] Test rate limiting
- [ ] Verify security headers

## Deployment Commands

### Build and Deploy
```bash
# Build images
docker compose build

# Start services
docker compose up -d

# Check health
curl http://localhost:8000/health/
curl http://localhost:8000/health/ready/

# View logs
docker compose logs -f backend
docker compose logs -f frontend
```

### Database Management
```bash
# Run migrations
docker compose exec backend python manage.py migrate

# Create superuser
docker compose exec backend python manage.py createsuperuser

# Backup database
docker compose exec db pg_dump -U postgres securemed > backup.sql

# Restore database
docker compose exec -T db psql -U postgres securemed < backup.sql
```

### Monitoring
```bash
# Check container status
docker compose ps

# View resource usage
docker stats

# Check logs
docker compose logs --tail=100 backend
docker compose logs --tail=100 frontend
```

## Post-Deployment

### Verification
- [ ] Test user login
- [ ] Test patient portal
- [ ] Test doctor portal
- [ ] Test admin portal
- [ ] Test pharmacy portal
- [ ] Verify health endpoints
- [ ] Check error logs
- [ ] Monitor performance metrics

### Documentation
- [ ] Update API documentation
- [ ] Document deployment process
- [ ] Create runbook for common issues
- [ ] Document backup procedures
- [ ] Update architecture diagrams

## Production URLs
- Frontend: https://your-domain.com
- Backend API: https://api.your-domain.com
- Admin Panel: https://api.your-domain.com/admin/
- Health Check: https://api.your-domain.com/health/

## Emergency Contacts
- DevOps Lead: [contact]
- Database Admin: [contact]
- Security Team: [contact]

## Rollback Procedure
1. Stop current deployment: `docker compose down`
2. Checkout previous version: `git checkout <previous-commit>`
3. Rebuild: `docker compose build`
4. Start services: `docker compose up -d`
5. Restore database if needed
6. Verify functionality
