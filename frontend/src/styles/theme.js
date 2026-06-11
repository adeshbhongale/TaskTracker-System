const themeOptions = {
  palette: {
    mode: 'light',
    primary: {
      main: '#2563eb',
      light: '#3b82f6',
      dark: '#1d4ed8',
      contrastText: '#ffffff'
    },
    secondary: {
      main: '#0ea5e9',
      light: '#38bdf8',
      dark: '#0284c7',
      contrastText: '#ffffff'
    },
    background: {
      default: '#f1f5f9',
      paper: '#ffffff',
      card: '#ffffff'
    },
    text: {
      primary: '#0f172a',
      secondary: '#475569',
      disabled: '#94a3b8'
    },
    success: {
      main: '#10b981',
      light: '#34d399',
      dark: '#059669'
    },
    warning: {
      main: '#f59e0b',
      light: '#fbbf24',
      dark: '#d97706'
    },
    error: {
      main: '#ef4444',
      light: '#f87171',
      dark: '#dc2626'
    },
    divider: 'rgba(0, 0, 0, 0.07)'
  },
  spacing: 8, // 8px base spacing
  shape: {
    borderRadius: 12
  },
  typography: {
    fontFamily: '"Inter", "Outfit", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '1.875rem',
      fontWeight: 700,
      letterSpacing: '-0.025em',
      lineHeight: 1.2
    },
    h2: {
      fontSize: '1.25rem',
      fontWeight: 600,
      letterSpacing: '-0.02em',
      lineHeight: 1.3
    },
    h3: {
      fontSize: '2rem',
      fontWeight: 800,
      letterSpacing: '-0.025em',
      lineHeight: 1.1
    },
    h4: {
      fontSize: '0.875rem',
      fontWeight: 600,
      letterSpacing: '-0.01em'
    },
    h5: {
      fontSize: '1.125rem',
      fontWeight: 600
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600
    },
    body1: {
      fontSize: '0.9375rem',
      lineHeight: 1.6
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
      color: '#475569'
    },
    caption: {
      fontSize: '0.75rem',
      lineHeight: 1.4
    },
    button: {
      fontWeight: 600,
      textTransform: 'none',
      fontSize: '0.875rem'
    }
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#f1f5f9'
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          padding: '8px 20px',
          boxShadow: 'none',
          transition: 'all 0.18s ease-in-out',
          '&:hover': {
            boxShadow: '0px 2px 8px rgba(37, 99, 235, 0.10)',
            transform: 'translateY(-1px)'
          },
          '&:active': {
            transform: 'translateY(0)'
          }
        },
        sizeSmall: {
          padding: '5px 12px',
          fontSize: '0.8rem'
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
          color: '#ffffff'
        },
        containedSecondary: {
          background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
          color: '#ffffff'
        },
        containedSuccess: {
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: '#ffffff'
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          backgroundImage: 'none',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)',
          border: '1px solid rgba(0, 0, 0, 0.06)',
          overflow: 'hidden',
          backgroundColor: '#ffffff',
          transition: 'box-shadow 0.2s ease'
        }
      }
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: '24px',
          '&:last-child': {
            paddingBottom: '24px'
          }
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#ffffff'
        }
      }
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 20,
          border: '1px solid rgba(0, 0, 0, 0.06)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15), 0 12px 24px -4px rgba(0, 0, 0, 0.08)'
        }
      }
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontSize: '1.125rem',
          fontWeight: 700,
          padding: '24px 24px 16px'
        }
      }
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: '0 24px 16px'
        }
      }
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: '16px 24px 24px',
          gap: 8
        }
      }
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 10,
            fontSize: '0.875rem',
            '& fieldset': {
              borderColor: 'rgba(0, 0, 0, 0.12)'
            },
            '&:hover fieldset': {
              borderColor: 'rgba(0, 0, 0, 0.22)'
            },
            '&.Mui-focused fieldset': {
              borderColor: '#2563eb',
              borderWidth: '1.5px'
            }
          },
          '& .MuiInputLabel-root': {
            fontSize: '0.875rem'
          }
        }
      }
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          fontSize: '0.875rem'
        }
      }
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          fontSize: '0.875rem',
          '& fieldset': {
            borderColor: 'rgba(0, 0, 0, 0.12)'
          },
          '&:hover fieldset': {
            borderColor: 'rgba(0, 0, 0, 0.22)'
          },
          '&.Mui-focused fieldset': {
            borderColor: '#2563eb',
            borderWidth: '1.5px'
          }
        }
      }
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontSize: '0.875rem'
        }
      }
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-root': {
            backgroundColor: '#f8fafc',
            fontWeight: 700,
            fontSize: '0.8rem',
            color: '#475569',
            letterSpacing: '0.02em',
            textTransform: 'uppercase',
            borderBottom: '1px solid rgba(0, 0, 0, 0.06)'
          }
        }
      }
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          transition: 'background-color 0.12s ease',
          '&.MuiTableRow-hover:hover': {
            backgroundColor: '#f8fafc'
          }
        }
      }
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid rgba(0, 0, 0, 0.04)',
          padding: '12px 16px',
          fontSize: '0.875rem'
        }
      }
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          fontSize: '0.72rem',
          letterSpacing: '0.01em'
        }
      }
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: '0.875rem',
          borderRadius: 8,
          margin: '2px 6px',
          padding: '8px 12px'
        }
      }
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 10
        }
      }
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          height: 6,
          backgroundColor: 'rgba(0, 0, 0, 0.06)'
        }
      }
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: '1px solid rgba(0, 0, 0, 0.06)',
          backgroundColor: '#ffffff'
        }
      }
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
          boxShadow: 'none',
          color: '#0f172a'
        }
      }
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: 'rgba(0, 0, 0, 0.06)'
        }
      }
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 10
        }
      }
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          fontWeight: 700
        }
      }
    }
  }
};

export default themeOptions;
