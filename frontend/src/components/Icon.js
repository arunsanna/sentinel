const e = React.createElement;

function Icon({ name, className }) { 
    return e('i', { 
        className: `fas fa-${name} ${className || ''}` 
    });
}
