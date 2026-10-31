import React, { useState, useEffect } from 'react';
import { Box, Typography, Chip, CircularProgress } from '@mui/material';
import { themeColors } from '../../theme/theme';
import { storeApi } from '../../hooks/useApi';
import { AuditLog } from '../../types';

export const AdminAuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    storeApi
      .getAdminAuditLogs()
      .then((res) => {
        const list = res.data?.data || res.data || [];
        setLogs(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        setLogs([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <Box>
      <Box sx={{ mb: 4, pb: 2, borderBottom: `1px solid ${themeColors.border}` }}>
        <Typography
          variant="h3"
          sx={{
            fontFamily: '"Syne", sans-serif',
            fontWeight: 800,
            textTransform: 'uppercase',
            fontSize: { xs: '1.8rem', md: '2.4rem' },
            mb: 0.5,
          }}
        >
          Administrative Audit Trail
        </Typography>
        <Typography variant="body2" sx={{ color: themeColors.textSecondary }}>
          Immutable record of sensitive operations, permission grants, and settings modifications.
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress size={36} color="inherit" />
        </Box>
      ) : logs.length === 0 ? (
        <Box sx={{ p: 6, textAlign: 'center', backgroundColor: '#FFFFFF', border: `1px solid ${themeColors.border}` }}>
          <Typography variant="h6" sx={{ fontFamily: '"Syne", sans-serif', fontWeight: 700, mb: 1 }}>
            No Audit Logs Recorded
          </Typography>
          <Typography variant="body2" sx={{ color: themeColors.textMuted }}>
            Administrative events like status updates and setting toggles will stream here.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ backgroundColor: '#FFFFFF', border: `1px solid ${themeColors.border}`, overflowX: 'auto' }}>
          <Box
            component="table"
            sx={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontFamily: '"Inter", sans-serif',
              fontSize: '0.85rem',
            }}
          >
            <Box component="thead">
              <Box component="tr" sx={{ borderBottom: `2px solid ${themeColors.border}`, backgroundColor: '#FAFAFA' }}>
                <Box component="th" sx={{ py: 2, px: 2, fontWeight: 700 }}>Timestamp</Box>
                <Box component="th" sx={{ py: 2, px: 2, fontWeight: 700 }}>Administrator</Box>
                <Box component="th" sx={{ py: 2, px: 2, fontWeight: 700 }}>Action</Box>
                <Box component="th" sx={{ py: 2, px: 2, fontWeight: 700 }}>Resource</Box>
                <Box component="th" sx={{ py: 2, px: 2, fontWeight: 700 }}>IP Address</Box>
              </Box>
            </Box>
            <Box component="tbody">
              {logs.map((log) => (
                <Box
                  component="tr"
                  key={log._id}
                  sx={{
                    borderBottom: `1px solid ${themeColors.border}`,
                    '&:hover': { backgroundColor: '#F9F9F7' },
                  }}
                >
                  <Box component="td" sx={{ py: 1.5, px: 2, fontSize: '0.8rem', color: themeColors.textMuted }}>
                    {log.createdAt || log.timestamp ? new Date(log.createdAt || log.timestamp || '').toLocaleString() : '—'}
                  </Box>
                  <Box component="td" sx={{ py: 1.5, px: 2, fontWeight: 600 }}>
                    {log.userEmail}
                  </Box>
                  <Box component="td" sx={{ py: 1.5, px: 2 }}>
                    <Chip
                      label={log.action}
                      size="small"
                      sx={{
                        borderRadius: 0,
                        fontWeight: 700,
                        fontSize: '0.65rem',
                        backgroundColor: '#1E293B',
                        color: '#FFF',
                      }}
                    />
                  </Box>
                  <Box component="td" sx={{ py: 1.5, px: 2, fontFamily: 'monospace' }}>
                    {log.resource}
                  </Box>
                  <Box component="td" sx={{ py: 1.5, px: 2, color: themeColors.textMuted, fontSize: '0.8rem' }}>
                    {log.ipAddress || '127.0.0.1'}
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default AdminAuditLogs;
