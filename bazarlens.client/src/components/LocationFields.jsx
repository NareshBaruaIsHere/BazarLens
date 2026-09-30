import { Field } from './UI';
import { changeLocation, locationOptions } from '../utils/locations';

export default function LocationFields({ markets, value, onChange, required = false }) {
  const options = locationOptions(markets, value);
  const fields = [
    ['division', 'Division', options.divisions, false],
    ['district', 'District', options.districts, !value.division],
    ['area', 'Thana', options.thanas, !value.district],
    ['marketId', 'Bazar', options.markets.map(m => ({value:m.id,label:m.name})), !value.area],
  ];
  return <>{fields.map(([key,label,items,disabled]) => <Field key={key} label={label} name={required ? key : undefined} value={value[key] || ''} onChange={event => onChange(changeLocation(value,key,event.target.value))} required={required} disabled={disabled} options={[{value:'',label:required ? `Select ${label.toLowerCase()}` : `All ${label === 'Bazar' ? 'bazars' : label === 'Thana' ? 'thanas' : label === 'District' ? 'districts' : 'divisions'}`},...items]}/>)}</>;
}
