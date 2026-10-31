import React, { useState, useEffect } from 'react';
import { Box, Grid, Typography, Card, CardContent, CircularProgress, Chip } from '@mui/material';
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import { themeColors } from '../../theme/theme';
import { storeApi } from '../../hooks/useApi';
import type { Order, Product } from '../../types';

export const AdminDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      storeApi.getAdminOrders().catch(() => ({ data: { data: [] } })),
      storeApi.getAdminProducts().catch(() => ({ data: { data: { products: [] } } })),
    ])
      .then(([ordersRes, productsRes]) => {
        const orderList = ordersRes.data?.data || ordersRes.data || [];
        const prodList =
          productsRes.data?.data?.products || productsRes.data?.products || productsRes.data?.data || [];
        setOrders(Array.isArray(orderList) ? orderList : []);
        setProducts(Array.isArray(prodList) ? prodList : []);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const totalGrossSales = orders.reduce(
    (sum, o) => sum + (o.pricing?.grandTotal || (o as any).grandTotal || 0),
    0
  );

  const totalReturnsDeduction = orders
    .filter((o) => o.returnStatus === 'APPROVED' || o.returnStatus === 'COMPLETED')
    .reduce((sum, o) => {
      const itemsDeduction = (o.returnedItems || []).reduce(
        (acc, it) => acc + (it.price * it.quantity),
        0
      );
      return sum + (itemsDeduction > 0 ? itemsDeduction : (o.pricing?.grandTotal || (o as any).grandTotal || 0));
    }, 0);

  const netSales = Math.max(0, totalGrossSales - totalReturnsDeduction);

  const activeOrdersCount = orders.filter(
    (o) => o.fulfillmentStatus !== 'DELIVERED' && o.fulfillmentStatus !== 'CANCELLED'
  ).length;
  const lowStockProducts = products.filter((p) => p.totalStock <= 5);

  const stats = [
    {
      label: 'Gross Sales',
      value: `₹${netSales.toLocaleString()}`,
      subtitle:
        totalReturnsDeduction > 0
          ? `₹${totalGrossSales.toLocaleString()} gross (-₹${totalReturnsDeduction.toLocaleString()} returned)`
          : 'From authorized payments',
      icon: <TrendingUpOutlinedIcon sx={{ fontSize: 28, color: '#10B981' }} />,
    },
    {
      label: 'Total Orders',
      value: orders.length.toString(),
      subtitle: `${activeOrdersCount} pending fulfillment`,
      icon: <ShoppingBagOutlinedIcon sx={{ fontSize: 28, color: '#3B82F6' }} />,
    },
    {
      label: 'Catalog Items',
      value: products.length.toString(),
      subtitle: 'Published listings',
      icon: <LocalShippingOutlinedIcon sx={{ fontSize: 28, color: '#8B5CF6' }} />,
    },
    {
      label: 'Low Stock Alerts',
      value: lowStockProducts.length.toString(),
      subtitle: 'Inventory <= 5 units',
      icon: <WarningAmberOutlinedIcon sx={{ fontSize: 28, color: '#EF4444' }} />,
    },
  ];

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
          Executive Overview
        </Typography>
        <Typography variant="body2" sx={{ color: themeColors.textSecondary }}>
          Live metrics, store fulfillment queue, and inventory alerts.
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress size={36} color="inherit" />
        </Box>
      ) : (
        <>
          {/* Stat Cards */}
          <Grid container spacing={3} sx={{ mb: 5 }}>
            {stats.map((stat) => (
              <Grid key={stat.label} size={{ xs: 12, sm: 6, md: 3 }}>
                <Card sx={{ p: 1 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          fontFamily: '"Syne", sans-serif',
                          fontWeight: 700,
                          color: themeColors.textMuted,
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                        }}
                      >
                        {stat.label}
                      </Typography>
                      {stat.icon}
                    </Box>
                    <Typography
                      variant="h4"
                      sx={{
                        fontFamily: '"Syne", sans-serif',
                        fontWeight: 800,
                        color: themeColors.textPrimary,
                        mb: 0.5,
                      }}
                    >
                      {stat.value}
                    </Typography>
                    <Typography variant="caption" sx={{ color: themeColors.textSecondary }}>
                      {stat.subtitle}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Recent Orders Overview */}
          <Box sx={{ backgroundColor: '#FFFFFF', border: `1px solid ${themeColors.border}`, p: 3, mb: 4 }}>
            <Typography
              variant="h5"
              sx={{
                fontFamily: '"Syne", sans-serif',
                fontWeight: 800,
                textTransform: 'uppercase',
                mb: 2,
              }}
            >
              Recent Orders Queue
            </Typography>

            {orders.length === 0 ? (
              <Typography variant="body2" sx={{ color: themeColors.textMuted, py: 3, textAlign: 'center' }}>
                No customer orders received yet. Place a test checkout on the storefront!
              </Typography>
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
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
                    <Box component="tr" sx={{ borderBottom: `2px solid ${themeColors.border}` }}>
                      <Box component="th" sx={{ py: 1.5, px: 2, fontWeight: 700 }}>Order #</Box>
                      <Box component="th" sx={{ py: 1.5, px: 2, fontWeight: 700 }}>Customer</Box>
                      <Box component="th" sx={{ py: 1.5, px: 2, fontWeight: 700 }}>Items</Box>
                      <Box component="th" sx={{ py: 1.5, px: 2, fontWeight: 700 }}>Total</Box>
                      <Box component="th" sx={{ py: 1.5, px: 2, fontWeight: 700 }}>Payment</Box>
                      <Box component="th" sx={{ py: 1.5, px: 2, fontWeight: 700 }}>Status</Box>
                    </Box>
                  </Box>
                  <Box component="tbody">
                    {orders.slice(0, 5).map((order) => {
                      const isReturnApprovedOrCompleted = order.returnStatus === 'APPROVED' || order.returnStatus === 'COMPLETED';
                      const returnedItemsCount = order.returnedItems?.reduce((acc, it) => acc + it.quantity, 0) || 0;
                      const orderGrandTotal = order.pricing?.grandTotal || (order as any).grandTotal || 0;
                      const returnedAmount = isReturnApprovedOrCompleted
                        ? (order.returnedItems && order.returnedItems.length > 0
                            ? order.returnedItems.reduce((acc, it) => acc + (it.price * it.quantity), 0)
                            : orderGrandTotal)
                        : 0;
                      const netOrderTotal = Math.max(0, orderGrandTotal - returnedAmount);

                      return (
                        <Box
                          component="tr"
                          key={order._id}
                          sx={{ borderBottom: `1px solid ${themeColors.border}`, '&:hover': { backgroundColor: '#F9F9F7' } }}
                        >
                          <Box component="td" sx={{ py: 1.5, px: 2, fontWeight: 700 }}>
                            #{order.orderNumber}
                          </Box>
                          <Box component="td" sx={{ py: 1.5, px: 2 }}>
                            {order.shippingAddress?.fullName || 'Customer'}
                          </Box>
                          <Box component="td" sx={{ py: 1.5, px: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                              <span>{order.items?.length || 0} pcs</span>
                              {isReturnApprovedOrCompleted && returnedItemsCount > 0 && (
                                <Chip
                                  label={`${returnedItemsCount} RETURNED`}
                                  size="small"
                                  sx={{
                                    borderRadius: 0,
                                    fontSize: '0.62rem',
                                    fontWeight: 700,
                                    height: 18,
                                    backgroundColor: '#FEE2E2',
                                    color: '#991B1B',
                                  }}
                                />
                              )}
                            </Box>
                          </Box>
                          <Box component="td" sx={{ py: 1.5, px: 2 }}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                                <Typography variant="body2" sx={{ fontWeight: 800, fontSize: '0.85rem' }}>
                                  ₹{netOrderTotal}
                                </Typography>
                                {isReturnApprovedOrCompleted && returnedAmount > 0 && (
                                  <Typography
                                    variant="caption"
                                    sx={{ textDecoration: 'line-through', color: themeColors.textMuted, fontSize: '0.72rem' }}
                                  >
                                    ₹{orderGrandTotal}
                                  </Typography>
                                )}
                              </Box>
                              {isReturnApprovedOrCompleted && returnedAmount > 0 && (
                                <Chip
                                  label={`-₹${returnedAmount} Returned`}
                                  size="small"
                                  sx={{
                                    borderRadius: 0,
                                    fontSize: '0.6rem',
                                    fontWeight: 700,
                                    height: 16,
                                    backgroundColor: '#FEF2F2',
                                    color: '#DC2626',
                                    border: '1px solid #FECACA',
                                    width: 'fit-content',
                                  }}
                                />
                              )}
                            </Box>
                          </Box>
                          <Box component="td" sx={{ py: 1.5, px: 2 }}>
                            <Chip
                              label={order.paymentMethod}
                              size="small"
                              sx={{ borderRadius: 0, fontSize: '0.68rem', fontWeight: 600 }}
                            />
                          </Box>
                          <Box component="td" sx={{ py: 1.5, px: 2 }}>
                            <Box sx={{ display: 'flex', gap: 0.6, flexWrap: 'wrap', alignItems: 'center' }}>
                              <Chip
                                label={order.fulfillmentStatus}
                                size="small"
                                sx={{
                                  borderRadius: 0,
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                  backgroundColor:
                                    order.fulfillmentStatus === 'DELIVERED'
                                      ? '#ECFDF5'
                                      : order.fulfillmentStatus === 'CONFIRMED'
                                      ? '#EFF6FF'
                                      : '#F3F4F6',
                                  color:
                                    order.fulfillmentStatus === 'DELIVERED'
                                      ? '#065F46'
                                      : order.fulfillmentStatus === 'CONFIRMED'
                                      ? '#1E40AF'
                                      : '#374151',
                                }}
                              />
                              {order.returnStatus && order.returnStatus !== 'NOT_REQUESTED' && (
                                <Chip
                                  label={`RETURN: ${order.returnStatus}`}
                                  size="small"
                                  sx={{
                                    borderRadius: 0,
                                    fontSize: '0.65rem',
                                    fontWeight: 800,
                                    backgroundColor:
                                      order.returnStatus === 'APPROVED' || order.returnStatus === 'COMPLETED'
                                        ? '#FEF3C7'
                                        : order.returnStatus === 'REJECTED'
                                        ? '#FEE2E2'
                                        : '#E0E7FF',
                                    color:
                                      order.returnStatus === 'APPROVED' || order.returnStatus === 'COMPLETED'
                                        ? '#92400E'
                                        : order.returnStatus === 'REJECTED'
                                        ? '#991B1B'
                                        : '#3730A3',
                                    border: '1px solid',
                                    borderColor:
                                      order.returnStatus === 'APPROVED' || order.returnStatus === 'COMPLETED'
                                        ? '#FDE68A'
                                        : order.returnStatus === 'REJECTED'
                                        ? '#FECACA'
                                        : '#C7D2FE',
                                  }}
                                />
                              )}
                            </Box>
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              </Box>
            )}
          </Box>
        </>
      )}
    </Box>
  );
};

export default AdminDashboard;
