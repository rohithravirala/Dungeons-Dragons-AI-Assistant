export default function GeneratorForm({ fields, values, onChange, onSubmit, buttonLabel, loading }) {
  return (
    <form className="generator-form" onSubmit={onSubmit}>
      {fields.map((field) => (
        <label key={field.name} className="form-field">
          <span>{field.label}</span>
          <input
            type="text"
            name={field.name}
            value={values[field.name] || ''}
            placeholder={field.placeholder}
            onChange={(event) => onChange(field.name, event.target.value)}
            required={field.required}
          />
        </label>
      ))}
      <button className="btn-generate" type="submit" disabled={loading}>
        {loading ? 'Generating...' : buttonLabel}
      </button>
    </form>
  );
}
