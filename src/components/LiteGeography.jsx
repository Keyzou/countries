import { Geography } from 'react-simple-maps';
import { deepEqual } from 'assert';

export default class LiteGeograpy extends Geography {
  shouldComponentUpdate(nextProps) {
    return !deepEqual(this.props.style, nextProps.style);
  }
}
